"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function searchPendingQCHeaders(designId: string, potonganKe: string) {
  try {
    const supabase = await createAdminClient();
    
    // We want to find production_headers matching designId and potonganKe
    // that have pending details.
    const { data, error } = await supabase
      .from("production_headers" as any)
      .select(`
        id,
        panel_no,
        nomor_mc,
        pic,
        tanggal_jam,
        operators ( nama_operator )
      `)
      .eq("design_id", designId)
      .eq("potongan_ke", potonganKe);

    if (error) {
      return { success: false, error: error.message };
    }

    // Since we can't easily filter by "has pending details" in a single query without RPC or complex joins,
    // we fetch headers, then check their details.
    if (!data || data.length === 0) {
      return { success: true, data: [] };
    }

    const headerIds = data.map((h: any) => h.id);

    const { data: detailsData, error: detailsError } = await supabase
      .from("production_details" as any)
      .select("header_id")
      .in("header_id", headerIds)
      .is("final_inspection_id", null);

    if (detailsError) {
      return { success: false, error: detailsError.message };
    }

    // Filter headers that actually have pending details
    const headersWithPending = new Set(detailsData?.map((d: any) => d.header_id));
    const pendingHeaders = data.filter((h: any) => headersWithPending.has(h.id));

    return { success: true, data: pendingHeaders };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getPendingQCDetails(headerId: string) {
  try {
    const supabase = await createAdminClient();
    
    const { data, error } = await supabase
      .from("production_details" as any)
      .select(`
        id,
        pcs_index,
        jml_hasil_produksi,
        kategori_masalah,
        detail_masalah,
        keterangan_cacat,
        meter_kain,
        roll_no,
        indikator_stop,
        final_inspection_id,
        keterangan_qc
      `)
      .eq("header_id", headerId)
      .is("final_inspection_id", null)
      .order("pcs_index", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function submitQCInspection(params: {
  details: { detailId: string; finalInspectionId: number }[];
  petugas_inspeksi: string;
  petugas_inspeksi_2?: string;
  tanggal_inspeksi: string;
  start_inspect: string;
  finish_inspect: string;
  berat_produksi: number;
  berat_inspecting: number;
  hasil_matching: string;
  petugas_mending?: string;
  tanggal_mending?: string;
  start_mending?: string;
  finish_mending?: string;
  prod_grade_a: number;
  prod_grade_b: number;
  prod_bs: number;
  qc_grade_a: number;
  qc_grade_b: number;
  qc_bs: number;
  notes?: string;
  tanggal_potong?: string;
}) {
  try {
    const supabase = await createAdminClient();
    
    // We do this in a loop or bulk.
    // Insert into qc_inspections for EACH detail
    const qcInspectionsData = params.details.map(d => ({
      production_detail_id: d.detailId,
      petugas_inspeksi: params.petugas_inspeksi,
      petugas_inspeksi_2: params.petugas_inspeksi_2 || null,
      tanggal_inspeksi: params.tanggal_inspeksi,
      start_inspect: params.start_inspect,
      finish_inspect: params.finish_inspect,
      berat_produksi: params.berat_produksi,
      berat_inspecting: params.berat_inspecting,
      hasil_matching: params.hasil_matching,
      petugas_mending: params.petugas_mending || null,
      tanggal_mending: params.tanggal_mending || null,
      start_mending: params.start_mending || null,
      finish_mending: params.finish_mending || null,
      prod_grade_a: params.prod_grade_a,
      prod_grade_b: params.prod_grade_b,
      prod_bs: params.prod_bs,
      qc_grade_a: params.qc_grade_a,
      qc_grade_b: params.qc_grade_b,
      qc_bs: params.qc_bs
    }));

    const { error: insertError } = await supabase
      .from("qc_inspections" as any)
      .insert(qcInspectionsData);

    if (insertError) {
      throw new Error("Gagal menyimpan data inspeksi: " + insertError.message);
    }

    // Bulk update final_inspection_id in production_details
    // Supabase JS doesn't have a direct bulk update via array easily,
    // so we iterate (it's safe enough for a few dozen rows)
    for (const d of params.details) {
      const { error: updateError } = await supabase
        .from("production_details" as any)
        .update({
          final_inspection_id: d.finalInspectionId,
          keterangan_qc: params.notes || null
        })
        .eq("id", d.detailId);
        
      if (updateError) {
        throw new Error("Gagal mengupdate status detail: " + updateError.message);
      }
    }

    // Sync to Google Sheets
    try {
      const detailIds = params.details.map(d => d.detailId);
      const { data: detailRecordsRaw } = await supabase
        .from("production_details" as any)
        .select("id, header_id, pcs_index")
        .in("id", detailIds);
      
      const detailRecords = (detailRecordsRaw || []) as any[];

      // Update tanggal_potong on production_headers
      if (params.tanggal_potong) {
        const uniqueHeaderIds = Array.from(new Set(detailRecords.map(r => r.header_id))).filter(Boolean);
        if (uniqueHeaderIds.length > 0) {
          const { error: updateHeaderError } = await supabase
            .from("production_headers" as any)
            .update({ tanggal_potong: params.tanggal_potong })
            .in("id", uniqueHeaderIds);
            
          if (updateHeaderError) {
            console.error("Gagal update tanggal potong:", updateHeaderError);
          }
        }
      }

      const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;
      if (sheetUrl && detailRecords && detailRecords.length > 0) {
        const payloadData = params.details.map(d => {
          const dbRecord = detailRecords.find((r: any) => r.id === d.detailId);
          let gradeStr = "";
          if (d.finalInspectionId === 1) gradeStr = "A";
          else if (d.finalInspectionId === 2) gradeStr = "B";
          else if (d.finalInspectionId === 3) gradeStr = "BS";

          return {
            id_header: dbRecord?.header_id || "",
            pcs_index: dbRecord?.pcs_index || "",
            petugas_qc1: params.petugas_inspeksi || "",
            petugas_qc2: params.petugas_inspeksi_2 || "",
            tanggal_qc: params.tanggal_inspeksi || "",
            waktu_qc: `${params.start_inspect || ""} - ${params.finish_inspect || ""}`,
            hasil_qc: gradeStr,
            berat_produksi: params.berat_produksi,
            berat_qc: params.berat_inspecting,
            hasil_matching: params.hasil_matching || "",
            keterangan_qc: params.notes || "",
            petugas_mending: params.petugas_mending || "",
            waktu_mending: (params.start_mending && params.finish_mending) ? `${params.start_mending} - ${params.finish_mending}` : "",
            tanggal_potong: params.tanggal_potong || "",
          };
        });

        const payload = {
          action: "update_qc",
          data: payloadData
        };

        fetch(sheetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).catch(err => console.error("Gagal sinkron QC ke Google Sheets:", err));
      }
    } catch (sheetErr) {
      console.error("Error preparing Google Sheets sync:", sheetErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error("Server error submitting QC inspection:", err);
    return { success: false, error: err.message };
  }
}

export async function getAvailableQCFilters() {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase.from("production_details" as any).select(`
      header_id,
      production_headers!inner (
        design_id,
        potongan_ke
      )
    `).is("final_inspection_id", null);

    if (error) return { success: false, error: error.message };

    const uniquePairs = new Map();
    for (const row of data || []) {
      const h = (row as any).production_headers;
      if (h) {
        const key = `${h.design_id}__${h.potongan_ke}`;
        if (!uniquePairs.has(key)) {
          uniquePairs.set(key, { design_id: h.design_id, potongan_ke: h.potongan_ke });
        }
      }
    }

    return { success: true, data: Array.from(uniquePairs.values()) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getPendingQCDetailsByBatch(designId: string, potonganKe: string) {
  try {
    const supabase = await createAdminClient();
    
    const { data: headers, error: headerError } = await supabase
      .from("production_headers" as any)
      .select("id, panel_no, nomor_mc, pic, tgl, tanggal_potong, pick, no_order_barang, operators(nama_operator)")
      .eq("design_id", designId)
      .eq("potongan_ke", potonganKe);

    if (headerError) return { success: false, error: headerError.message };
    if (!headers || headers.length === 0) return { success: true, data: [] };

    const headerIds = headers.map((h: any) => h.id);

    const { data: details, error: detailsError } = await supabase
      .from("production_details" as any)
      .select("id, pcs_index, jml_hasil_produksi, kategori_masalah, detail_masalah, keterangan_cacat, meter_kain, roll_no, indikator_stop, final_inspection_id, header_id")
      .in("header_id", headerIds)
      .is("final_inspection_id", null);

    if (detailsError) return { success: false, error: detailsError.message };

    const detailsWithHeader = (details || []).map((d: any) => {
      const h = headers.find((h: any) => h.id === d.header_id);
      return { ...d, production_headers: h };
    });

    return { success: true, data: detailsWithHeader };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getQCHistory() {
  try {
    const supabase = await createAdminClient();
    
    const { data, error } = await supabase
      .from("qc_inspections" as any)
      .select(`
        *,
        production_details (
          id, pcs_index, final_inspection_id, header_id, roll_no, keterangan_qc,
          production_headers (
            id, design_id, potongan_ke, panel_no, nomor_mc, pic, tgl, tanggal_potong, pick, no_order_barang
          )
        )
      `)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return { success: false, error: error.message };
    }

    const formattedData = (data || []).map((row: any) => {
      const detail = row.production_details || {};
      const header = detail.production_headers || {};
      return {
        ...row,
        detail,
        header
      };
    });

    return { success: true, data: formattedData };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getAvailableHistoryQCDesignPotongan() {
  try {
    const supabase = await createAdminClient();
    const { data: details, error } = await supabase.from("production_details" as any).select("header_id").not("final_inspection_id", "is", null);
    if (error) return { success: false, error: error.message };
    if (!details || details.length === 0) return { success: true, data: [] };
    
    const headerIds = Array.from(new Set(details.map((d: any) => d.header_id)));
    
    const { data: headers, error: headersError } = await supabase.from("production_headers" as any).select("id, design_id, potongan_ke").in("id", headerIds);
    if (headersError) return { success: false, error: headersError.message };
    
    return { success: true, data: headers };
  } catch (err: any) { 
    return { success: false, error: err.message }; 
  }
}

export async function getQCHistoryByBatch(designId: string, potonganKe: string) {
  try {
    const supabase = await createAdminClient();
    
    const { data: headers, error: hErr } = await supabase.from("production_headers" as any).select("id").eq("design_id", designId).eq("potongan_ke", potonganKe);
    if (hErr) return { success: false, error: hErr.message };
    if (!headers || headers.length === 0) return { success: true, data: [] };
    
    const headerIds = headers.map((h: any) => h.id);
    
    const { data: details, error: dErr } = await supabase.from("production_details" as any).select("id").in("header_id", headerIds).not("final_inspection_id", "is", null);
    if (dErr) return { success: false, error: dErr.message };
    if (!details || details.length === 0) return { success: true, data: [] };
    
    const detailIds = details.map((d: any) => d.id);
    
    const { data: qcData, error: qcErr } = await supabase.from("qc_inspections" as any).select(`
      *,
      production_details (
        id, pcs_index, final_inspection_id, header_id, roll_no, keterangan_qc, 
        production_headers (id, design_id, potongan_ke, panel_no, nomor_mc, pic, tgl, tanggal_potong, pick, no_order_barang)
      )
    `).in("production_detail_id", detailIds).order("created_at", { ascending: false });
    
    if (qcErr) return { success: false, error: qcErr.message };
    
    const formattedData = (qcData || []).map((row: any) => ({ 
      ...row, 
      detail: row.production_details || {}, 
      header: row.production_details?.production_headers || {} 
    }));
    
    return { success: true, data: formattedData };
  } catch (err: any) { 
    return { success: false, error: err.message }; 
  }
}
