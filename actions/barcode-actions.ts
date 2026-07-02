"use server";

import { createClient } from "@/lib/supabase/server";

export async function getBatchesForBarcode(filters: {
  nomor_mc?: string;
  design_id?: string;
  potongan_ke?: string;
}) {
  try {
    const supabase = await createClient();
    let query = supabase.from("production_headers").select(`
      id, nomor_mc, design_id, potongan_ke, no_order_barang, no_customer, tgl,
      production_details!inner (
        id, pcs_index, status_mending,
        qc_inspection_items ( qc_inspection_batches ( berat_kain ) ),
        mending_items!inner (id)
      )
    `);

    if (filters.nomor_mc) query = query.eq("nomor_mc", filters.nomor_mc);
    if (filters.design_id) query = query.eq("design_id", filters.design_id);
    if (filters.potongan_ke) query = query.eq("potongan_ke", parseInt(filters.potongan_ke));

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const formatted = (data || []).flatMap((h: any) => {
      if (!h.production_details || h.production_details.length === 0) return [];
      
      return h.production_details.map((d: any) => {
        let berat = 0;
        if (d.qc_inspection_items && d.qc_inspection_items.length > 0) {
           berat = Number(d.qc_inspection_items[0].qc_inspection_batches?.berat_kain) || 0;
        }
        
        return {
          id: d.id, // using detail id
          header_id: h.id,
          pcs_index: d.pcs_index,
          nomor_mc: h.nomor_mc,
          design_id: h.design_id,
          potongan_ke: h.potongan_ke,
          no_order_barang: h.no_order_barang,
          no_customer: h.no_customer,
          tgl: h.tgl,
          berat_kain: berat,
          jumlah_panel: 1 // since this is 1 pcs
        };
      });
    });

    // Remove duplicates just in case
    const uniqueMap = new Map();
    formatted.forEach(f => {
      if (!uniqueMap.has(f.id)) {
        uniqueMap.set(f.id, f);
      }
    });

    return { success: true, data: Array.from(uniqueMap.values()) };

  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
