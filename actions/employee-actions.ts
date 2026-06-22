"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { productionFormSchema, ProductionFormInput } from "@/lib/schemas";
import { crypto } from "next/dist/compiled/@edge-runtime/primitives/crypto";

// Helper untuk menghasilkan ID acak 8 karakter seperti di Excel (misal: e78cbacd)
function generateExcelStyleId(): string {
  const chars = "abcdef0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createProductionReport(inputData: ProductionFormInput): Promise<{
  success: boolean;
  productionId?: string;
  error?: string;
}> {
  try {
    // 1. Validasi data input secara server-side menggunakan Zod
    const validated = productionFormSchema.parse(inputData);

    const productionId = generateExcelStyleId();
    const now = new Date();
    
    // Format tanggal ke YYYY-MM-DD
    const tgl = now.toISOString().split("T")[0];
    
    // Format timestamp lengkap ke YYYY-MM-DD HH:mm:ss
    const tanggalJam = now.toLocaleString("sv-SE").replace("T", " ");

    const operatorIdNum = validated.operatorId ? parseInt(validated.operatorId) : null;
    const groupIdNum = validated.groupId ? parseInt(validated.groupId) : null;
    const designIdNum = validated.designId ? parseInt(validated.designId) : null;

    const rpmNum = validated.rpm ? parseInt(validated.rpm) : null;
    const potonganKeNum = validated.potonganKe ? parseInt(validated.potonganKe) : null;
    const panelNoNum = validated.panelNo ? parseInt(validated.panelNo) : null;
    const pcsNum = validated.pcs ? parseInt(validated.pcs) : null;
    const jmlHasilNum = validated.jmlHasilProduksi ? parseInt(validated.jmlHasilProduksi) : null;

    // Perhitungan otomatis Ket PCS: true jika hasil produksi >= target PCS
    const ketPcs = (jmlHasilNum !== null && pcsNum !== null) ? (jmlHasilNum >= pcsNum) : null;

    // Konversi status inspeksi ("lolos" -> true, "recheck" -> false)
    const statusInspeksiBool = validated.statusInspeksi === "lolos";

    // 2. Coba simpan ke database Supabase jika terkonfigurasi
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey && supabaseAnonKey !== "your_supabase_anon_key_here") {
      try {
        const supabase = await createAdminClient();

        // A. Insert ke tabel `productions`
        const { error: prodError } = await supabase
          .from("productions")
          .insert({
            id: productionId,
            tgl,
            tanggal_jam: tanggalJam,
            operator_id: operatorIdNum,
            group_id: groupIdNum,
            design_id: designIdNum,
            course: validated.course || null,
            rpm: rpmNum,
            potongan_ke: potonganKeNum,
            panel_no: panelNoNum,
            pcs: pcsNum,
            jml_hasil_produksi: jmlHasilNum,
            ket_pcs: ketPcs,
            status_inspeksi: statusInspeksiBool,
            keterangan: validated.keterangan || null,
            pic: validated.pic || null,
            // Kolom-kolom baru (pastikan sudah dibuat di Supabase)
            tanggal_potong: validated.tanggalPotong || null,
            pick: validated.pick || null,
            no_order_barang: validated.noOrderBarang || null,
            roll_no: validated.rollNo || null,
            jenis_benang_dasar: validated.jenisBenangDasar || null,
            liner: validated.liner || null,
            heavy: validated.heavy || null,
            shadow: validated.shadow || null,
            pinggiran: validated.pinggiran || null,
            // Foto sudah tidak dipakai, tapi jika ada kolomnya biarkan null
            foto_before: validated.fotoBefore || null,
            foto_after: validated.fotoAfter || null,
          });

        if (prodError) throw new Error(`Gagal menyimpan produksi: ${prodError.message}`);

        // B. Jika ada masalah yang dilaporkan, simpan ke tabel `production_problems`
        if (validated.problems && Object.keys(validated.problems).length > 0) {
          const problemEntries = Object.entries(validated.problems).map(([category, details]) => ({
            production_id: productionId,
            problem_id: parseInt(details.problemId),
            keterangan_tambahan: details.keterangan || null,
          }));

          const { error: probError } = await supabase
            .from("production_problems")
            .insert(problemEntries);

          if (probError) {
            console.error("Gagal menyimpan detail masalah:", probError);
            // Jangan batalkan transaksi produksi utama jika hanya pencatatan masalah gagal, 
            // namun log errornya.
          }
        }

        return { success: true, productionId };
      } catch (dbErr: any) {
        console.error("Database error details:", dbErr);
        return { success: false, error: dbErr.message || "Gagal menyimpan laporan ke database." };
      }
    }

    // 3. Fallback/Mock Mode jika database belum dikonfigurasi (Demo aman)
    console.log("Mock Mode: Berhasil mensimulasikan penyimpanan produksi rajut", {
      productionId,
      tgl,
      tanggalJam,
      validated,
      ketPcs,
    });
    
    // Delay simulasi jaringan
    await new Promise((resolve) => setTimeout(resolve, 800));

    return { success: true, productionId };
  } catch (err: any) {
    console.error("Server action error:", err);
    return { success: false, error: err.message || "Terjadi kesalahan sistem saat memproses laporan." };
  }
}

export async function uploadProductionPhoto(
  base64Data: string,
  fileName: string
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    const supabase = await createAdminClient();

    // Hapus base64 header (contoh: data:image/jpeg;base64,)
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Image, "base64");

    const filePath = `mesin/${fileName}`;

    const { data, error } = await supabase.storage
      .from("production-photos")
      .upload(filePath, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from("production-photos")
      .getPublicUrl(filePath);

    return { success: true, publicUrl: publicUrlData.publicUrl };
  } catch (err: any) {
    console.error("Server photo upload failed:", err);
    return { success: false, error: err.message || "Gagal mengunggah foto ke server." };
  }
}

export async function getLastPanelNoByPotongan(potonganKe: number): Promise<{ success: boolean; nextPanelNo?: number; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === "your_supabase_anon_key_here") {
      return { success: true, nextPanelNo: 1 };
    }

    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("productions")
      .select("panel_no")
      .eq("potongan_ke", potonganKe)
      .order("panel_no", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error fetching last panel_no:", error);
      return { success: false, error: error.message };
    }

    if (data && data.length > 0 && data[0].panel_no != null) {
      return { success: true, nextPanelNo: data[0].panel_no + 1 };
    }

    return { success: true, nextPanelNo: 1 };
  } catch (err: any) {
    console.error("Server action error in getLastPanelNoByPotongan:", err);
    return { success: false, error: err.message };
  }
}
