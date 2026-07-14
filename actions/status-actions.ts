"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Helper untuk menghasilkan ID acak 8 karakter seperti di Excel
function generateExcelStyleId(): string {
  const chars = "abcdef0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export interface StatusMesinInput {
  nomorMc: string;
  pic: string;
  grupId?: string;
  pick?: string;
  course?: string;
  rpm?: string;
  designId?: string;
  status: string; // e.g. "TUNGGU ORDER"
  tanggalOff?: string;
  idempotencyKey?: string;
}

export async function submitStatusMesin(inputData: StatusMesinInput) {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tanggalJam = formatter.format(now);
    const tgl = inputData.tanggalOff || tanggalJam.split(" ")[0];

    const headerId = generateExcelStyleId();

    const headerData = {
      id: headerId,
      tgl,
      tanggal_jam: tanggalJam,
      nomor_mc: inputData.nomorMc,
      panel_no: "BERHENTI", 
      pcs: null, 
      pick: inputData.pick || null,
      course: inputData.course || null,
      rpm: inputData.rpm ? parseInt(inputData.rpm) : null,
      design_id: inputData.designId || null,
      total_downtime_detik: 0,
      idempotency_key: inputData.idempotencyKey || null,
      pic: inputData.pic,
      group_id: inputData.grupId ? parseInt(inputData.grupId) : 1, // Fallback default
    };

    const detailData = [{
      id: generateExcelStyleId() + "-1",
      header_id: headerId,
      pcs_index: null,
      jml_hasil_produksi: null,
      indikator_stop: true,
      kategori_masalah: null,
      detail_masalah: inputData.status,
    }];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey && supabaseAnonKey !== "your_supabase_anon_key_here") {
      const supabase = await createClient();

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const adminSupabase = await createAdminClient();
          const { data: profile } = await adminSupabase
            .from("user_profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();
          if (profile) {
            (headerData as any).created_by_name = profile.full_name;
          }
        }
      } catch (err) {
        console.error("Gagal mendapatkan PIC nama:", err);
      }

      const { error: insertHeaderError } = await supabase
        .from("production_headers")
        .insert(headerData as any);

      if (insertHeaderError) {
        if (insertHeaderError.code === "23505" && inputData.idempotencyKey) {
          return { success: true };
        }
        throw new Error("Failed to insert status header: " + insertHeaderError.message);
      }

      const { error: detailError } = await supabase
        .from("production_details")
        .insert(detailData as any);

      if (detailError) {
        throw new Error(`Gagal menyimpan detail status: ${detailError.message}`);
      }

      revalidatePath("/(employee)/history");
      return { success: true, productionId: headerId };
    }

    // Fallback trigger Google Sheets
    const sheetUrlMock = process.env.GOOGLE_SHEET_URL || process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;
    if (sheetUrlMock) {
      const payloadMock = [{
        "ID Laporan": headerId,
        "Tanggal Produksi": tgl,
        "Tanggal & Jam": tanggalJam,
        Mesin: inputData.nomorMc,
        Operator: inputData.pic,
        Design: inputData.designId,
        Pick: inputData.pick,
        Course: inputData.course,
        RPM: inputData.rpm,
        Panel: "BERHENTI",
        "Total Downtime (Detik)": 0,
        "PCS Ke": "",
        "Hasil PCS": "",
        "Mesin Stop?": "Ya",
        "Kategori Masalah": "",
        "Keterangan Cacat": inputData.status,
      }];

      fetch(sheetUrlMock, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "insert", data: payloadMock }),
      }).catch((err) => console.error("Mock webhook error:", err));
    }

    return { success: true, productionId: headerId };
  } catch (error: any) {
    console.error("Submit Status Mesin Error:", error);
    return { success: false, error: error.message };
  }
}
