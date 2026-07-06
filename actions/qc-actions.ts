"use server";

import { createClient } from "@/lib/supabase/server";

export async function searchPendingQCHeaders(designId: string, potonganKe: string) {
  try {
    const supabase = await createClient();
    
    // We want to find production_headers matching designId and potonganKe
    // that have pending details.
    const { data, error } = await supabase
      .from("production_headers")
      .select(`
        id,
        panel_no,
        nomor_mc,
        pic,
        tanggal_jam,
        operators ( nama_operator )
      `)
      .eq("design_id", designId)
      .eq("potongan_ke", parseInt(potonganKe));

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
      .from("production_details")
      .select("header_id")
      .in("header_id", headerIds)
      .is("status_inspeksi", null);

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
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("production_details")
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
      .is("status_inspeksi", null)
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
  berat_kain?: number | null;
  prod_ceklis: number;
  prod_silang: number;
  qc_ceklis: number;
  qc_silang: number;
  notes?: string;
  tanggal_potong?: string;
}) {
  try {
    const supabase = await createClient();
    
    // 1. Dapatkan informasi mesin, dll dari production_details
    const detailIds = params.details.map(d => d.detailId);
    const { data: detailsInfo } = await supabase
      .from("production_details")
      .select("pcs_index, production_headers(nomor_mc, design_id, potongan_ke)")
      .in("id", detailIds)
      .limit(1)
      .single();

    let nomor_mc = null, design_id = null, potongan_ke = null, pcs_index = null;
    if (detailsInfo) {
      pcs_index = detailsInfo.pcs_index;
      if (detailsInfo.production_headers) {
        nomor_mc = (detailsInfo.production_headers as any).nomor_mc;
        design_id = (detailsInfo.production_headers as any).design_id;
        potongan_ke = (detailsInfo.production_headers as any).potongan_ke;
      }
    }

    // 2. Insert ke qc_inspection_batches
    const { data: batchData, error: batchError } = await supabase
      .from("qc_inspection_batches")
      .insert({
        tanggal_inspeksi: params.tanggal_inspeksi,
        start_inspect: params.start_inspect,
        finish_inspect: params.finish_inspect,
        petugas_inspeksi: params.petugas_inspeksi,
        petugas_inspeksi_2: params.petugas_inspeksi_2 || null,
        nomor_mc,
        design_id,
        potongan_ke,
        pcs_index,
        berat_kain: params.berat_kain,
        inspeksi_ceklis: params.qc_ceklis,
        inspeksi_silang: params.qc_silang
      })
      .select("id")
      .single();

    if (batchError || !batchData) {
      throw new Error("Gagal menyimpan data induk batch inspeksi: " + (batchError?.message || "Unknown error"));
    }

    // 3. Insert ke qc_inspection_items
    const qcItemsData = params.details.map(d => ({
      batch_id: batchData.id,
      production_detail_id: d.detailId,
      final_inspection_id: d.finalInspectionId
    }));

    const { error: insertError } = await supabase
      .from("qc_inspection_items")
      .insert(qcItemsData);

    if (insertError) {
      throw new Error("Gagal menyimpan data rincian inspeksi: " + insertError.message);
    }

    // Bulk update final_inspection_id in production_details
    // Supabase JS doesn't have a direct bulk update via array easily,
    // so we iterate (it's safe enough for a few dozen rows)
    for (const d of params.details) {
      const { error: updateError } = await supabase
        .from("production_details")
        .update({
          final_inspection_id: d.finalInspectionId,
          status_inspeksi: d.finalInspectionId === 1 ? 'Ceklis' : 'Silang',
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
        .from("production_details")
        .select("id, header_id, pcs_index")
        .in("id", detailIds);
      
      const detailRecords = (detailRecordsRaw || []) as any[];

      // Update tanggal_potong on production_headers
      if (params.tanggal_potong) {
        const uniqueHeaderIds = Array.from(new Set(detailRecords.map(r => r.header_id))).filter(Boolean);
        if (uniqueHeaderIds.length > 0) {
          const { error: updateHeaderError } = await supabase
            .from("production_headers")
            .update({ tanggal_potong: params.tanggal_potong })
            .in("id", uniqueHeaderIds);
            
          if (updateHeaderError) {
            console.error("Gagal update tanggal potong:", updateHeaderError);
          }
        }
      }

      const sheetUrl = process.env.GOOGLE_SHEET_URL || process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;
      if (sheetUrl && detailRecords && detailRecords.length > 0) {
        const payloadData = params.details.map(d => {
          const dbRecord = detailRecords.find((r: any) => r.id === d.detailId);
          let gradeStr = "";
          if (d.finalInspectionId === 1) gradeStr = "Ceklis";
          else if (d.finalInspectionId === 3) gradeStr = "Silang";

          return {
            id_header: dbRecord?.header_id || "",
            pcs_index: dbRecord?.pcs_index || "",
            petugas_qc1: params.petugas_inspeksi || "",
            petugas_qc2: params.petugas_inspeksi_2 || "",
            tanggal_qc: params.tanggal_inspeksi || "",
            waktu_qc: `${params.start_inspect || ""} - ${params.finish_inspect || ""}`,
            hasil_qc: gradeStr,
            berat_kain: params.berat_kain,
            keterangan_qc: params.notes || "",
            prod_ceklis: params.prod_ceklis,
            prod_silang: params.prod_silang,
            qc_ceklis: params.qc_ceklis,
            qc_silang: params.qc_silang,
            tanggal_potong: params.tanggal_potong || "",
          };
        });

        const payload = {
          action: "update_qc",
          data: payloadData
        };

        console.log("[QC Sheet Sync] Sending payload:", JSON.stringify(payload));
        
        fetch(sheetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          redirect: "follow"
        }).then(async (res) => {
          const text = await res.text();
          console.log("[QC Sheet Sync] Response status:", res.status, "body:", text);
        }).catch(err => console.error("[QC Sheet Sync] Fetch error:", err));
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
    const supabase = await createClient();
    const { data, error } = await supabase.from("production_details").select(`
      header_id,
      production_headers!inner (
        nomor_mc,
        design_id,
        potongan_ke,
        tgl
      )
    `).is("final_inspection_id", null);

    if (error) return { success: false, error: error.message };

    const uniquePairs = new Map();
    for (const row of data || []) {
      const h = (row as any).production_headers;
      if (h) {
        const key = `${h.tgl}__${h.nomor_mc}__${h.design_id}__${h.potongan_ke}`;
        if (!uniquePairs.has(key)) {
          uniquePairs.set(key, { tgl: h.tgl, nomor_mc: h.nomor_mc, design_id: h.design_id, potongan_ke: h.potongan_ke });
        }
      }
    }

    return { success: true, data: Array.from(uniquePairs.values()) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getPendingQCDetailsByBatch(mesin: string, designId: string, potonganKe: string, tanggal?: string) {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from("production_headers")
      .select("id, panel_no, nomor_mc, pic:created_by_name, tgl, tanggal_potong, pick, no_order_barang, operators(nama_operator)")
      .eq("nomor_mc", mesin)
      .eq("design_id", designId)
      .eq("potongan_ke", parseInt(potonganKe));
      
    if (tanggal) {
      query = query.eq("tgl", tanggal);
    }

    const { data: headers, error: headerError } = await query;

    if (headerError) return { success: false, error: headerError.message };
    if (!headers || headers.length === 0) return { success: true, data: [] };

    const headerIds = headers.map((h: any) => h.id);

    const { data: details, error: detailsError } = await supabase
      .from("production_details")
      .select("id, pcs_index, jml_hasil_produksi, kategori_masalah, detail_masalah, keterangan_cacat, meter_kain, roll_no, indikator_stop, final_inspection_id, header_id")
      .in("header_id", headerIds)
      .is("final_inspection_id", null);

    if (detailsError) return { success: false, error: detailsError.message };

    const detailsWithHeader = (details || []).map((d: any) => {
      const h = headers.find((h: any) => h.id === d.header_id);
      return { ...d, production_headers: h };
    });

    // Untuk jenis METERAN, hanya baris detail yang memiliki cacat/masalah (kategori_masalah tidak kosong) yang perlu diinspeksi.
    // Baris rangkuman start/finish tidak akan diinspeksi.
    const filteredDetails = detailsWithHeader.filter((d: any) => {
      const h = d.production_headers;
      if (h && h.panel_no === "METERAN") {
        return d.kategori_masalah !== null && d.kategori_masalah !== undefined && d.kategori_masalah.trim() !== "";
      }
      return true;
    });

    return { success: true, data: filteredDetails };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getQCHistory() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("qc_inspection_batches")
      .select(`
        *,
        qc_inspection_items (
          production_details (
            id, pcs_index, final_inspection_id, header_id, roll_no, keterangan_qc,
            production_headers (
              id, design_id, potongan_ke, panel_no, nomor_mc, pic:created_by_name, tgl, tanggal_potong, pick, no_order_barang, status_matching
            )
          )
        )
      `)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return { success: false, error: error.message };
    }

    const formattedData = (data || []).map((row: any) => {
      // Just extract the first item's details since they belong to the same batch headers essentially
      const firstItem = row.qc_inspection_items && row.qc_inspection_items.length > 0 ? row.qc_inspection_items[0] : null;
      const detail = firstItem?.production_details || {};
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
    const supabase = await createClient();
    const { data: details, error } = await supabase.from("production_details").select("header_id").not("final_inspection_id", "is", null);
    if (error) return { success: false, error: error.message };
    if (!details || details.length === 0) return { success: true, data: [] };
    
    const headerIds = Array.from(new Set(details.map((d: any) => d.header_id)));
    
    const { data: headers, error: headersError } = await supabase.from("production_headers").select("id, design_id, potongan_ke").in("id", headerIds);
    if (headersError) return { success: false, error: headersError.message };
    
    return { success: true, data: headers };
  } catch (err: any) { 
    return { success: false, error: err.message }; 
  }
}

export async function getQCHistoryByBatch(designId: string, potonganKe: string) {
  try {
    const supabase = await createClient();
    
    const { data: headers, error: hErr } = await supabase.from("production_headers").select("id").eq("design_id", designId).eq("potongan_ke", parseInt(potonganKe));
    if (hErr) return { success: false, error: hErr.message };
    if (!headers || headers.length === 0) return { success: true, data: [] };
    
    const headerIds = headers.map((h: any) => h.id);
    
    const { data: details, error: dErr } = await supabase.from("production_details").select("id").in("header_id", headerIds).not("final_inspection_id", "is", null);
    if (dErr) return { success: false, error: dErr.message };
    if (!details || details.length === 0) return { success: true, data: [] };
    
    const detailIds = details.map((d: any) => d.id);
    
    const { data: qcData, error: qcErr } = await supabase.from("qc_inspection_batches").select(`
      *,
      qc_inspection_items!inner (
        production_detail_id,
        production_details (
          id, pcs_index, final_inspection_id, header_id, roll_no, keterangan_qc, 
          production_headers (id, design_id, potongan_ke, panel_no, nomor_mc, pic:created_by_name, tgl, tanggal_potong, pick, no_order_barang, status_matching)
        )
      )
    `).in("qc_inspection_items.production_detail_id", detailIds).order("created_at", { ascending: false });
    
    if (qcErr) return { success: false, error: qcErr.message };
    
    const formattedData = (qcData || []).map((row: any) => {
      const firstItem = row.qc_inspection_items && row.qc_inspection_items.length > 0 ? row.qc_inspection_items[0] : null;
      return { 
        ...row, 
        detail: firstItem?.production_details || {}, 
        header: firstItem?.production_details?.production_headers || {} 
      };
    });
    
    return { success: true, data: formattedData };
  } catch (err: any) { 
    return { success: false, error: err.message }; 
  }
}

export async function searchQCHistory(filters: {
  date?: string;
  nomor_mc?: string;
  petugas_ids?: string[];
  design_id?: string;
  potongan_ke?: string;
  no_customer?: string;
}) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === "your_supabase_anon_key_here") {
      return { success: true, data: [] };
    }

    const supabase = await createClient();
    
    let query = supabase
      .from("qc_inspection_batches")
      .select(`
        *,
        items:qc_inspection_items!inner (
          id, final_inspection_id,
          detail:production_details!inner (
            id, pcs_index, final_inspection_id, header_id, roll_no, meter_kain, keterangan_qc,
            header:production_headers!inner (id, design_id, potongan_ke, panel_no, nomor_mc, pic:created_by_name, tgl, tanggal_potong, pick, no_order_barang, status_matching)
          )
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (filters.date) {
      query = query.eq("tanggal_inspeksi", filters.date);
    }
    
    if (filters.nomor_mc) {
      query = query.ilike("nomor_mc", `%${filters.nomor_mc}%`);
    }

    if (filters.design_id) {
      query = query.ilike("design_id", `%${filters.design_id}%`);
    }
    
    if (filters.potongan_ke) {
      query = query.eq("potongan_ke", parseInt(filters.potongan_ke));
    }
    
    if (filters.no_customer) {
      query = query.ilike("items.detail.header.no_order_barang", `%${filters.no_customer}%`);
    }
    
    if (filters.petugas_ids && filters.petugas_ids.length > 0) {
      const orConds = filters.petugas_ids.map(p => `petugas_inspeksi.eq."${p}",petugas_inspeksi_2.eq."${p}"`).join(",");
      query = query.or(orConds);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error searching QC history:", error);
      return { success: false, error: error.message };
    }

    // Format data to match the UI expectations
    const formattedData = (data || []).map((batch: any) => {
      // Extract the header from the first item, as all items in a batch share the same batch info
      const firstItem = batch.items && batch.items.length > 0 ? batch.items[0] : null;
      const header = firstItem?.detail?.header || {};
      
      // Map items to match the old detail structure slightly if needed, but UI will mostly use batch.items
      const formattedItems = (batch.items || []).map((item: any) => ({
        id: item.id,
        final_inspection_id: item.final_inspection_id,
        detail: item.detail || {},
        header: item.detail?.header || {}
      }));

      return {
        ...batch,
        header,
        detail: { pcs_index: batch.pcs_index }, // Mock detail.pcs_index for backward compatibility in some places
        items: formattedItems
      };
    });

    return { success: true, data: formattedData };
  } catch (err: any) {
    console.error("Server action error in searchQCHistory:", err);
    return { success: false, error: err.message };
  }
}

export async function addQCDefectDetail(params: {
  headerId: string;
  meterKain: string;
  rollNo?: string;
  kategoriMasalah: string[];
  detailMasalah?: string;
  keteranganCacat?: string;
}) {
  try {
    const supabase = await createClient();
    
    // Generate a unique detail id
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let randId = "";
    for (let i = 0; i < 8; i++) {
      randId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const detailId = randId.toLowerCase();

    // Map kategoriMasalah array to comma-separated string
    const kategoriStr = params.kategoriMasalah && params.kategoriMasalah.length > 0 
      ? params.kategoriMasalah.join(', ') 
      : null;

    const { data, error } = await supabase
      .from("production_details")
      .insert({
        id: detailId,
        header_id: params.headerId,
        pcs_index: 1, // default index for meteran
        meter_kain: parseFloat(params.meterKain) || null,
        roll_no: params.rollNo || null,
        kategori_masalah: kategoriStr,
        detail_masalah: params.detailMasalah || null,
        keterangan_cacat: params.keteranganCacat || null,
        indikator_stop: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Sync new defect finding to Google Sheets
    try {
      const sheetUrl = process.env.GOOGLE_SHEET_URL || process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;
      if (sheetUrl) {
        // Fetch header info for the payload
        const { data: headerData } = await supabase
          .from("production_headers")
          .select("*")
          .eq("id", params.headerId)
          .single();

        if (headerData) {
          const payload = [{
            "ID Laporan": headerData.id,
            "Tanggal Produksi": headerData.tgl || "",
            "Tanggal & Jam": new Date().toISOString(),
            "Tanggal Potong": headerData.tanggal_potong || "",
            "Mesin": headerData.nomor_mc || "",
            "Pick": headerData.pick || "",
            "Course": headerData.course || "",
            "RPM": headerData.rpm || "",
            "Operator": headerData.pic || headerData.created_by_name || "",
            "Grup": headerData.group_id || "",
            "Design": headerData.design_id || "",
            "Panel": headerData.panel_no || "METERAN",
            "Potongan Ke": headerData.potongan_ke || "",
            "No Order": headerData.no_order_barang || "",
            "No Customer": headerData.no_customer || "",
            "Total Downtime (Detik)": headerData.total_downtime_menit || 0,
            "Meter Awal": headerData.meter_awal || "",
            "Meter Akhir": headerData.meter_akhir || "",
            "Total Produksi Meter": headerData.hasil_produksi_meter || "",
            "PCS Ke": 1,
            "Hasil PCS": 0,
            "Meter Kain": params.meterKain || "",
            "Roll No": params.rollNo || "",
            "Mesin Stop?": "Ya",
            "Kategori Masalah": kategoriStr || "",
            "Detail Masalah": params.detailMasalah || "",
            "Keterangan Cacat": params.keteranganCacat ? `[QC INSPEKSI] ${params.keteranganCacat}` : "[QC INSPEKSI]",
            "Penanggung Jawab": headerData.created_by_name || ""
          }];

          console.log("[QC Defect Sync] Sending payload:", JSON.stringify(payload));
          
          fetch(sheetUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "insert_production", data: payload }),
            redirect: "follow"
          }).then(async (res) => {
            console.log("[QC Defect Sync] Sheet response status:", res.status);
          }).catch(err => console.error("[QC Defect Sync] Fetch error:", err));
        }
      }
    } catch (sheetErr) {
      console.error("Error syncing new QC defect to sheet:", sheetErr);
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

