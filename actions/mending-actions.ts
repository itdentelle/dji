"use server";

import { createClient } from "@/lib/supabase/server";

export async function getAvailableMendingFilters() {
  try {
    const supabase = await createClient();
    
    // Step 1: Get all items that haven't been mended yet (pending mending)
    const { data: pendingMending, error: err1 } = await supabase
      .from("production_details")
      .select(`
        pcs_index,
        production_headers!inner (
          nomor_mc,
          design_id,
          potongan_ke
        )
      `)
      .not("final_inspection_id", "is", null)
      .is("status_mending", null);

    if (err1) {
      if (err1.message.includes("status_mending")) {
        return { success: false, error: "Tabel belum memiliki kolom status_mending. Harap jalankan script SQL migrasi." };
      }
      return { success: false, error: err1.message };
    }

    // Step 2: Get all items still pending inspection (not yet inspected)
    const { data: pendingInspection, error: err2 } = await supabase
      .from("production_details")
      .select(`
        pcs_index,
        production_headers!inner (
          nomor_mc,
          design_id,
          potongan_ke
        )
      `)
      .is("final_inspection_id", null);

    if (err2) return { success: false, error: err2.message };

    // Build set of PCS groups that still have uninspected items
    const pendingInspGroups = new Set<string>();
    for (const row of pendingInspection || []) {
      const h = (row as any).production_headers;
      if (h) pendingInspGroups.add(`${h.nomor_mc}__${h.design_id}__${h.potongan_ke}__${(row as any).pcs_index}`);
    }

    // Build mending filters: include batch if it has at least one PCS that is FULLY inspected and pending mending
    const uniquePairs = new Map();
    for (const row of pendingMending || []) {
      const h = (row as any).production_headers;
      if (h) {
        const pcsKey = `${h.nomor_mc}__${h.design_id}__${h.potongan_ke}__${(row as any).pcs_index}`;
        const batchKey = `${h.nomor_mc}__${h.design_id}__${h.potongan_ke}`;
        
        // If this specific PCS is fully inspected
        if (!pendingInspGroups.has(pcsKey)) {
          if (!uniquePairs.has(batchKey)) {
            uniquePairs.set(batchKey, { nomor_mc: h.nomor_mc, design_id: h.design_id, potongan_ke: h.potongan_ke });
          }
        }
      }
    }

    return { success: true, data: Array.from(uniquePairs.values()) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getPendingMendingDetailsByBatch(mesin: string, designId: string, potonganKe: string) {
  try {
    const supabase = await createClient();
    
    const { data: headers, error: headerError } = await supabase
      .from("production_headers")
      .select("id, panel_no, nomor_mc, pic, tgl, tanggal_potong, pick, no_order_barang, operators(nama_operator)")
      .eq("nomor_mc", mesin)
      .eq("design_id", designId)
      .eq("potongan_ke", parseInt(potonganKe));

    if (headerError) return { success: false, error: headerError.message };
    if (!headers || headers.length === 0) return { success: true, data: [] };

    const headerIds = headers.map((h: any) => h.id);

    // Get ALL items in this batch to determine which PCS are fully inspected
    const { data: allItems, error: allError } = await supabase
      .from("production_details")
      .select("id, pcs_index, final_inspection_id, status_mending, header_id")
      .in("header_id", headerIds);

    if (allError) return { success: false, error: allError.message };

    // Find PCS indexes that still have uninspected items (final_inspection_id IS NULL)
    const pcsWithPendingInspection = new Set<number>();
    for (const item of (allItems || []) as any[]) {
      if (item.final_inspection_id === null) {
        pcsWithPendingInspection.add(item.pcs_index);
      }
    }

    // Get inspected & unmended items, but only from fully-inspected PCS indexes
    const { data: details, error: detailsError } = await supabase
      .from("production_details")
      .select("id, pcs_index, jml_hasil_produksi, kategori_masalah, detail_masalah, keterangan_cacat, meter_kain, roll_no, indikator_stop, final_inspection_id, header_id, qc_inspections(berat_inspecting)")
      .in("header_id", headerIds)
      .not("final_inspection_id", "is", null)
      .is("status_mending", null);

    if (detailsError) return { success: false, error: detailsError.message };

    // Filter out items from PCS indexes that are not fully inspected yet
    const filteredDetails = (details || []).filter((d: any) => !pcsWithPendingInspection.has(d.pcs_index));

    const detailsWithHeader = filteredDetails.map((d: any) => {
      const h = headers.find((h: any) => h.id === d.header_id);
      return { ...d, production_headers: h };
    });

    return { success: true, data: detailsWithHeader };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function submitMending(params: {
  details: { detailId: string; grade: string }[];
  petugas_mending: string;
  tanggal_mending: string;
  start_mending: string;
  finish_mending: string;
  mending_grade_a: number;
  mending_grade_b: number;
  mending_grade_bs: number;
  notes?: string;
  berat_kain?: number;
}) {
  try {
    const supabase = await createClient();
    
    // Bulk update status_mending in production_details
    for (const d of params.details) {
      const { error: updateError } = await supabase
        .from("production_details")
        .update({ status_mending: d.grade })
        .eq("id", d.detailId);
        
      if (updateError) {
        console.error("Gagal update status mending:", updateError);
      }
    }

    // Update berat_inspecting in qc_inspections if berat_kain is provided
    if (params.berat_kain !== undefined) {
      const detailIds = params.details.map(d => d.detailId);
      const { error: qcUpdateError } = await supabase
        .from("qc_inspections")
        .update({ berat_inspecting: params.berat_kain })
        .in("production_detail_id", detailIds);
        
      if (qcUpdateError) {
        console.error("Gagal update berat_inspecting di qc_inspections:", qcUpdateError);
      }
    }

    // Insert into mending_inspections for each panel
    const mendingInspectionsData = params.details.map(d => ({
      production_detail_id: d.detailId,
      petugas_mending: params.petugas_mending,
      tanggal_mending: params.tanggal_mending,
      start_mending: params.start_mending,
      finish_mending: params.finish_mending,
      mending_grade_a: d.grade === 'A' ? 1 : 0,
      mending_grade_b: d.grade === 'B' ? 1 : 0,
      mending_grade_bs: d.grade === 'BS' ? 1 : 0,
      hasil_mending: params.notes || ""
    }));

    const { error: insertError } = await supabase
      .from("mending_inspections")
      .insert(mendingInspectionsData);

    if (insertError) {
       console.error("Warning: Gagal menyimpan data mending_inspections.", insertError);
    }

    // Webhook logic
    try {
      const detailIds = params.details.map(d => d.detailId);
      const { data: detailRecordsRaw } = await supabase
        .from("production_details")
        .select("id, header_id, pcs_index")
        .in("id", detailIds);
      
      const detailRecords = (detailRecordsRaw || []) as any[];

      const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;
      if (sheetUrl && detailRecords && detailRecords.length > 0) {
        const payloadData = params.details.map(d => {
          const dbRecord = detailRecords.find((r: any) => r.id === d.detailId);

          return {
            id_header: dbRecord?.header_id || "",
            pcs_index: dbRecord?.pcs_index || "",
            petugas_mending: params.petugas_mending,
            waktu_mending: `${params.start_mending} - ${params.finish_mending}`,
            hasil_mending: d.grade,
            keterangan_mending: params.notes || "",
            tanggal_mending: params.tanggal_mending,
          };
        });

        const payload = {
          action: "update_mending",
          data: payloadData
        };

        console.log("[Mending Sheet Sync] Sending payload:", JSON.stringify(payload));

        fetch(sheetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          redirect: "follow"
        }).then(async (res) => {
          const text = await res.text();
          console.log("[Mending Sheet Sync] Response status:", res.status, "body:", text);
        }).catch(err => console.error("Gagal sinkron Mending ke Google Sheets:", err));
      }
    } catch (sheetErr) {
      console.error("Error preparing Google Sheets sync for mending:", sheetErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error("Server error submitting mending:", err);
    return { success: false, error: err.message };
  }
}

export async function getAvailableHistoryMendingDesignPotongan() {
  try {
    const supabase = await createClient();
    // Only get records that have been mended (status_mending is not null)
    const { data: details, error } = await supabase.from("production_details").select("header_id").not("status_mending", "is", null);
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

export async function getMendingHistoryByBatch(designId: string, potonganKe: string) {
  try {
    const supabase = await createClient();
    
    const { data: headers, error: hErr } = await supabase.from("production_headers").select("id").eq("design_id", designId).eq("potongan_ke", parseInt(potonganKe));
    if (hErr) return { success: false, error: hErr.message };
    if (!headers || headers.length === 0) return { success: true, data: [] };
    
    const headerIds = headers.map((h: any) => h.id);
    
    const { data: details, error: dErr } = await supabase.from("production_details").select("id").in("header_id", headerIds).not("status_mending", "is", null);
    if (dErr) return { success: false, error: dErr.message };
    if (!details || details.length === 0) return { success: true, data: [] };
    
    const detailIds = details.map((d: any) => d.id);
    
    const { data: mendingData, error: mendingErr } = await supabase.from("mending_inspections").select(`
      *,
      production_details (
        id, pcs_index, final_inspection_id, status_mending, header_id, roll_no, keterangan_qc,
        production_headers (id, design_id, potongan_ke, panel_no, nomor_mc, pic, tgl, tanggal_potong, pick, no_order_barang)
      )
    `).in("production_detail_id", detailIds).order("created_at", { ascending: false });
    
    if (mendingErr) return { success: false, error: mendingErr.message };
    
    const formattedData = (mendingData || []).map((row: any) => ({ 
      ...row, 
      detail: row.production_details || {}, 
      header: row.production_details?.production_headers || {} 
    }));
    
    return { success: true, data: formattedData };
  } catch (err: any) { 
    return { success: false, error: err.message }; 
  }
}

export async function searchMendingHistory(filters: {
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
      .from("mending_inspections")
      .select(`
        *,
        production_details!inner (
          id, pcs_index, final_inspection_id, status_mending, header_id, roll_no, keterangan_qc,
          production_headers!inner (id, design_id, potongan_ke, panel_no, nomor_mc, pic, tgl, tanggal_potong, pick, no_order_barang)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (filters.date) {
      query = query.eq("tanggal_mending", filters.date);
    }
    
    if (filters.nomor_mc) {
      query = query.ilike("production_details.production_headers.nomor_mc", `%${filters.nomor_mc}%`);
    }

    if (filters.design_id) {
      query = query.ilike("production_details.production_headers.design_id", `%${filters.design_id}%`);
    }
    
    if (filters.potongan_ke) {
      query = query.eq("production_details.production_headers.potongan_ke", parseInt(filters.potongan_ke));
    }
    
    if (filters.no_customer) {
      query = query.ilike("production_details.production_headers.no_order_barang", `%${filters.no_customer}%`);
    }
    
    if (filters.petugas_ids && filters.petugas_ids.length > 0) {
      const orConds = filters.petugas_ids.map(p => `petugas_mending.eq."${p}"`).join(",");
      query = query.or(orConds);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error searching Mending history:", error);
      return { success: false, error: error.message };
    }

    const formattedData = (data || []).map((row: any) => ({
      ...row,
      detail: row.production_details || {},
      header: row.production_details?.production_headers || {}
    }));

    return { success: true, data: formattedData };
  } catch (err: any) {
    console.error("Server action error in searchMendingHistory:", err);
    return { success: false, error: err.message };
  }
}

