"use server";

import { createClient } from "@/lib/supabase/server";

export interface SuratJalanItem {
  nomor_mc: string;
  design_id: string;
  potongan_ke: string;
  berat_kain: string;
  jumlah_panel: number; // This will just be 1 since it's per PCS, but we keep the name
  pcs_ke: string;
  grade: string;
  no_order: string;
  no_customer: string;
}

export interface SuratJalanHeader {
  tujuan: string;
  alamat_detail: string;
  kab_kota: string;
  provinsi: string;
  kode_pos: string;
  negara: string;
  telepon: string;
  supir: string;
  no_polisi: string;
  keterangan: string;
  pakai_benang_dji: boolean;
}

function generateSJNumber(): string {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `SJ-${yyyy}${mm}${dd}-${random}`;
}

export async function createSuratJalan(header: SuratJalanHeader, details: SuratJalanItem[]) {
  try {
    const supabase: any = await createClient();

    const no_surat_jalan = generateSJNumber();
    const tgl = new Date().toISOString().split('T')[0];

    // Insert Header
    const { data: sjData, error: sjError } = await supabase
      .from("surat_jalan")
      .insert({
        no_surat_jalan,
        tanggal: tgl,
        tujuan: JSON.stringify({
          tujuan: header.tujuan,
          alamat_detail: header.alamat_detail,
          kab_kota: header.kab_kota,
          provinsi: header.provinsi,
          kode_pos: header.kode_pos,
          negara: header.negara,
          telepon: header.telepon,
          pakai_benang_dji: header.pakai_benang_dji
        }),
        supir: header.supir,
        no_polisi: header.no_polisi,
        keterangan: header.keterangan,
        status: "DRAFT"
      })
      .select("id")
      .single();

    if (sjError) throw new Error("Gagal menyimpan header: " + sjError.message);
    if (!sjData) throw new Error("Gagal mendapatkan ID Surat Jalan");

    // Insert Details
    const detailsToInsert = details.map(d => ({
      surat_jalan_id: sjData.id,
      nomor_mc: d.nomor_mc,
      design_id: d.design_id,
      potongan_ke: d.potongan_ke,
      berat_kain: d.berat_kain,
      jumlah_panel: d.jumlah_panel,
      grade: d.grade,
      no_order: `${d.pcs_ke || "-"}|||${d.no_order || "-"}|||${d.no_customer || "-"}`
    }));

    const { error: detailError } = await supabase
      .from("surat_jalan_details")
      .insert(detailsToInsert);

    if (detailError) throw new Error("Gagal menyimpan detail kain: " + detailError.message);

    return { success: true, id: sjData.id, no_surat_jalan };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getSuratJalanList(dateFilter?: string) {
  try {
    const supabase: any = await createClient();
    
    let query = supabase
      .from("surat_jalan")
      .select(`
        *,
        surat_jalan_details ( count )
      `)
      .order("created_at", { ascending: false });

    if (dateFilter) {
      query = query.eq("tanggal", dateFilter);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getSuratJalanById(id: string) {
  try {
    const supabase: any = await createClient();
    
    const { data, error } = await supabase
      .from("surat_jalan")
      .select(`
        *,
        surat_jalan_details (*)
      `)
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateSuratJalanStatus(id: string, status: string) {
  try {
    const supabase: any = await createClient();
    
    const { error } = await supabase
      .from("surat_jalan")
      .update({ status })
      .eq("id", id);

    if (error) throw new Error(error.message);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
