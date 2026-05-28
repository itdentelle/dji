"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function getPendingInspections() {
  try {
    const supabase = await createAdminClient();
    
    // Ambil data produksi yang belum diinspeksi (final_inspection_id is null)
    const { data, error } = await supabase
      .from("productions")
      .select(`
        id,
        tgl,
        tanggal_jam,
        potongan_ke,
        panel_no,
        pcs,
        jml_hasil_produksi,
        status_inspeksi,
        keterangan,
        foto_before,
        foto_after,
        operators ( id, nama_operator ),
        designs ( id, nama_design ),
        groups ( id, nama_grup )
      `)
      .is("final_inspection_id", null)
      .order("tanggal_jam", { ascending: false });

    if (error) {
      console.error("Gagal mengambil antrean inspeksi:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("Server error getting pending inspections:", err);
    return { success: false, error: err.message };
  }
}

export async function submitQCInspection(params: {
  productionId: string;
  finalInspectionId: number; // 1 (Grade A), 2 (Grade B), 3 (BS)
  notes?: string;
  fotoAfterUrl?: string | null;
}) {
  try {
    const supabase = await createAdminClient();
    const { productionId, finalInspectionId, notes, fotoAfterUrl } = params;

    // Ambil keterangan yang sudah ada (jika ada) untuk digabungkan
    const { data: existingData } = await supabase
      .from("productions")
      .select("keterangan, foto_after")
      .eq("id", productionId)
      .single();

    let newKeterangan = existingData?.keterangan || "";
    if (notes) {
      newKeterangan = newKeterangan 
        ? `${newKeterangan}\n[QC Notes]: ${notes}`
        : `[QC Notes]: ${notes}`;
    }

    // Jika operator sudah upload foto_after, jangan di-override kecuali QC upload foto baru
    const finalFotoAfter = fotoAfterUrl || existingData?.foto_after || null;

    const { error } = await supabase
      .from("productions")
      .update({
        final_inspection_id: finalInspectionId,
        keterangan: newKeterangan,
        foto_after: finalFotoAfter
      })
      .eq("id", productionId);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (err: any) {
    console.error("Server error submitting QC inspection:", err);
    return { success: false, error: err.message };
  }
}
