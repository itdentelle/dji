"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { productionFormSchema, ProductionFormInput } from "@/lib/schemas";
import { crypto } from "next/dist/compiled/@edge-runtime/primitives/crypto";
import { revalidatePath } from "next/cache";

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

    
    const now = new Date();
    
    // Dapatkan waktu di zona WIB (Asia/Jakarta)
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    // Format timestamp lengkap ke YYYY-MM-DD HH:mm:ss
    const tanggalJam = formatter.format(now);
    
    // Format tanggal ke YYYY-MM-DD
    const tgl = tanggalJam.split(" ")[0];

    const operatorIdNum = validated.operatorId ? parseInt(validated.operatorId) : null;
    const groupIdNum = validated.groupId ? parseInt(validated.groupId) : null;
    const designIdNum = validated.designId ? parseInt(validated.designId) : null;

    const rpmNum = validated.rpm ? parseInt(validated.rpm) : null;
    const potonganKeNum = validated.potonganKe ? parseInt(validated.potonganKe) : null;
    const statusInspeksiBool = null;
    const photoUrls = {
        before: validated.fotoBefore || null,
        after: validated.fotoAfter || null
    };

    // 1. Siapkan data untuk Tabel Header
    const headerId = generateExcelStyleId();
    const panelNoNum = validated.panelNo ? parseInt(validated.panelNo) : null;
    const pcsTarget = validated.pcsData.length;

    const totalDowntimeNum = validated.totalDowntime ? parseInt(validated.totalDowntime) : null;

    const headerData = {
      id: headerId,
      tgl,
      tanggal_jam: tanggalJam,
      operator_id: operatorIdNum,
      group_id: parseInt(validated.groupId),
      design_id: validated.designId,
      nomor_mc: validated.nomorMc || null,
      status_matching: validated.statusMatching,
      course: validated.course || null,
      rpm: validated.rpm ? parseInt(validated.rpm) : null,
      potongan_ke: validated.potonganKe ? parseInt(validated.potonganKe) : null,
      panel_no: validated.panelNo,
      pcs: pcsTarget,
      tanggal_potong: validated.tanggalPotong || null,
      pick: validated.pick || null,
      no_order_barang: validated.noOrderBarang || null,
      no_customer: validated.noCustomer || null,
      jenis_benang_dasar: validated.jenisBenangDasar || null,
      liner: validated.liner || null,
      heavy: validated.heavy || null,
      shadow: validated.shadow || null,
      pinggiran: validated.pinggiran || null,
      foto_before: photoUrls.before,
      foto_after: photoUrls.after,
      total_downtime_detik: totalDowntimeNum,
      idempotency_key: validated.idempotencyKey || null,
      created_by_name: null as string | null,
    };

    // 2. Siapkan Data Details
    const detailData = validated.pcsData.map((pcsItem, idx) => {
      const detailId = generateExcelStyleId() + "-" + idx;
      const jmlHasilNum = pcsItem.jmlHasilProduksi ? parseInt(pcsItem.jmlHasilProduksi) : null;
      const pcsIndexNum = pcsItem.pcsIndex ? parseInt(pcsItem.pcsIndex) : null;

      // Gabungkan array kategori menjadi string, pisahkan dengan koma
      const kategoriStr = pcsItem.kategoriMasalah && pcsItem.kategoriMasalah.length > 0 
        ? pcsItem.kategoriMasalah.join(', ') 
        : null;

      return {
        id: detailId,
        header_id: headerId,
        pcs_index: pcsIndexNum,
        jml_hasil_produksi: jmlHasilNum,
        indikator_stop: pcsItem.indikatorStop || false,
        kategori_masalah: kategoriStr,
        detail_masalah: pcsItem.detailMasalah || null,
        keterangan_cacat: pcsItem.keteranganCacat || null,
        meter_kain: pcsItem.meterKain || null,
      };
    });

    // 3. Coba simpan ke database Supabase jika terkonfigurasi
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey && supabaseAnonKey !== "your_supabase_anon_key_here") {
      try {
        const supabase = await createClient();

        // Ambil nama penanggung jawab berdasarkan akun login
        try {
          if (validated.created_by_name) {
            headerData.created_by_name = validated.created_by_name;
          } else {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const adminSupabase = await createAdminClient();
              const { data: profile } = await adminSupabase
                .from("user_profiles")
                .select("full_name")
                .eq("id", user.id)
                .single();
              if (profile) {
                headerData.created_by_name = profile.full_name;
              }
            }
          }
        } catch (err) {
          console.error("Gagal mendapatkan PIC nama:", err);
        }

        // Cek duplikasi potongan_ke dan panel_no
        if (potonganKeNum && validated.panelNo) {
          const { data: existingPanel } = await supabase
            .from("production_headers")
            .select("id")
            .eq("potongan_ke", potonganKeNum)
            .eq("panel_no", validated.panelNo)
            .limit(1);

          if (existingPanel && existingPanel.length > 0) {
            return { success: false, error: `Potongan ke-${potonganKeNum} dengan Panel ${validated.panelNo} sudah ada!` };
          }
        }

        // A. Insert ke Tabel Header
        const { error: insertHeaderError } = await supabase
          .from("production_headers")
          .insert(headerData);

        if (insertHeaderError) {
          if (insertHeaderError.code === "23505") {
            console.warn("Idempotency key duplicate detected. Returning success.");
            return { success: true };
          }
          throw new Error("Gagal menyimpan header: " + insertHeaderError.message);
        }

        // B. Insert ke Tabel Detail
        const { error: detailError } = await supabase
          .from("production_details")
          .insert(detailData as any);

        if (detailError) throw new Error(`Gagal menyimpan detail PCS: ${detailError.message}`);

        // Update tanggal_potong massal untuk potongan_ke yang sama
        if (validated.tanggalPotong && validated.nomorMc && potonganKeNum) {
          // Ambil ID laporan sebelumnya yang terkait
          const { data: previousHeaders } = await supabase
            .from("production_headers")
            .select("*, production_details(*)")
            .eq("nomor_mc", validated.nomorMc)
            .eq("potongan_ke", potonganKeNum)
            .neq("id", headerId);

          await supabase
            .from("production_headers")
            .update({ tanggal_potong: validated.tanggalPotong })
            .eq("nomor_mc", validated.nomorMc)
            .eq("potongan_ke", potonganKeNum);

          // Trigger sinkronisasi update ke Google Sheets untuk panel-panel sebelumnya
          const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;
          if (sheetUrl && previousHeaders && previousHeaders.length > 0) {
            // Gabungkan semua payload menjadi satu array besar
            let massPayload: any[] = [];
            for (const h of previousHeaders as any[]) {
              const details = h.production_details || [];
              for (const detail of details) {
                massPayload.push({
                  id_header: h.id,
                  pcs_index: detail.pcs_index || "",
                  tanggal_potong: validated.tanggalPotong
                });
              }
            }
            
            if (massPayload.length > 0) {
              fetch(sheetUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "update", data: massPayload })
              }).catch(err => console.error("Gagal sinkron massal Google Sheets:", err));
            }
          }
        }

        // C. Trigger Sinkronisasi Google Sheets (secara asinkron, tidak memblokir return)
        const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;
        if (sheetUrl) {
          const payload = detailData.map((detail: any) => ({
            "ID Laporan": headerId,
            "Tanggal Produksi": tgl || "",
            "Tanggal & Jam": tanggalJam,
            "Tanggal Potong": validated.tanggalPotong || "",
            "Mesin": validated.nomorMc || "",
            "Pick": validated.pick || "",
            "Course": validated.course || "",
            "RPM": validated.rpm || "",
            "Operator": validated.pic || validated.operatorId?.[0] || "",
            "Grup": validated.grupName || validated.groupId || "",
            "Design": validated.designName || validated.designId || "",
            "Status Matching": validated.statusMatching || "",
            "Panel": validated.panelNo || "",
            "Potongan Ke": validated.potonganKe || "",
            "No Order": validated.noOrderBarang || "",
            "No Customer": validated.noCustomer || "",
            "Total Downtime (Detik)": totalDowntimeNum || 0,
            "Meter Awal": "",
            "Meter Akhir": "",
            "Total Produksi Meter": "",
            "PCS Ke": detail.pcs_index || "",
            "Hasil PCS": detail.jml_hasil_produksi || 0,
            "Meter Kain": detail.meter_kain || "",
            "Roll No": detail.roll_no || "",
            "Mesin Stop?": detail.indikator_stop ? "Ya" : "Tidak",
            "Kategori Masalah": detail.kategori_masalah || "",
            "Detail Masalah": detail.detail_masalah || "",
            "Keterangan Cacat": detail.keterangan_cacat || "",
            "Penanggung Jawab": headerData.created_by_name || ""
          }));

          fetch(sheetUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          }).then(async (res) => {
            if (res.ok) {
              const client = await createClient();
              await client.from("production_headers").update({ is_synced_to_sheet: true }).eq("id", headerId);
            }
          }).catch(err => console.error("Gagal sinkron Google Sheets:", err));
        }

        return { success: true, productionId: headerId };
      } catch (dbErr: any) {
        console.error("Database error details:", dbErr);
        return { success: false, error: dbErr.message || "Gagal menyimpan laporan ke database." };
      }
    }

    // 3. Fallback/Mock Mode jika database belum dikonfigurasi (Demo aman)
    console.log("Mock Mode: Berhasil mensimulasikan penyimpanan produksi rajut", {
      headerId,
      tgl,
      tanggalJam,
      validated,
    });

    // C. Trigger Sinkronisasi Google Sheets (secara asinkron) bahkan di Mock Mode
    const sheetUrlMock = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;
    if (sheetUrlMock) {
      const payloadMock = detailData.map((detail: any) => ({
        "ID Laporan": headerId,
        "Tanggal Produksi": tgl || "",
        "Tanggal & Jam": tanggalJam,
        "Tanggal Potong": validated.tanggalPotong || "",
        "Mesin": validated.nomorMc || "",
        "Pick": validated.pick || "",
        "Course": validated.course || "",
        "RPM": validated.rpm || "",
        "Operator": validated.pic || validated.operatorId?.[0] || "",
        "Grup": validated.grupName || validated.groupId || "",
        "Design": validated.designName || validated.designId || "",
        "Panel": validated.panelNo || "",
        "Potongan Ke": validated.potonganKe || "",
        "No Order": validated.noOrderBarang || "",
        "No Customer": validated.noCustomer || "",
        "Total Downtime (Detik)": totalDowntimeNum || 0,
        "Meter Awal": "",
        "Meter Akhir": "",
        "Total Produksi Meter": "",
        "PCS Ke": detail.pcs_index || "",
        "Hasil PCS": detail.jml_hasil_produksi || 0,
        "Meter Kain": detail.meter_kain || "",
        "Roll No": detail.roll_no || "",
        "Mesin Stop?": detail.indikator_stop ? "Ya" : "Tidak",
        "Kategori Masalah": detail.kategori_masalah || "",
        "Detail Masalah": detail.detail_masalah || "",
        "Keterangan Cacat": detail.keterangan_cacat || ""
      }));

      fetch(sheetUrlMock, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadMock)
      }).catch(err => console.error("Gagal sinkron Google Sheets:", err));
    }
    
    // Delay simulasi jaringan
    await new Promise((resolve) => setTimeout(resolve, 800));

    revalidatePath("/(employee)/history");
    return { success: true, productionId: headerId };
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
    const supabase = await createClient();

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

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("production_headers")
      .select("panel_no")
      .eq("potongan_ke", potonganKe)
      .not("panel_no", "is", null)
      .not("panel_no", "eq", "METERAN")
      .order("tanggal_jam", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error fetching last panel_no:", error);
      return { success: false, error: error.message };
    }

    if (data && data.length > 0 && (data as any[])[0].panel_no != null) {
      // Ekstrak angka jika formatnya string misal "1"
      const lastNumberMatch = (data as any[])[0].panel_no.match(/\d+$/);
      if (lastNumberMatch) {
        return { success: true, nextPanelNo: parseInt(lastNumberMatch[0], 10) + 1 };
      }
      const num = parseInt((data as any[])[0].panel_no, 10);
      if (!isNaN(num)) {
        return { success: true, nextPanelNo: num + 1 };
      }
    }

    return { success: true, nextPanelNo: 1 };
  } catch (err: any) {
    console.error("Server action error in getLastPanelNoByPotongan:", err);
    return { success: false, error: err.message };
  }
}
export async function searchEmployeeHistory(filters: { 
  date?: string;
  nomor_mc?: string;
  group_id?: string;
  operator_ids?: string[];
  design_id?: string;
  potongan_ke?: string;
  tanggal_potong?: string;
  no_customer?: string;
}): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === "your_supabase_anon_key_here") {
      // Mock data for demo
      return { success: true, data: [] };
    }

    const supabase = await createClient();
    let query = supabase
      .from("production_headers")
      .select("id, tgl, tanggal_jam, pic, potongan_ke, pcs, no_order_barang, panel_no, nomor_mc, total_downtime_detik, operators(nama_operator), groups(nama_grup), design_id, production_details(kategori_masalah)")
      .order("tanggal_jam", { ascending: false })
      .limit(100);

    if (filters.date) query = query.eq("tgl", filters.date);
    if (filters.nomor_mc) query = query.ilike("nomor_mc", `%${filters.nomor_mc}%`);
    if (filters.group_id) query = query.eq("group_id", parseInt(filters.group_id));
    
    if (filters.operator_ids && filters.operator_ids.length > 0) {
      // Fetch operator names first to search in 'pic'
      const { data: opData } = await supabase.from("operators").select("id, nama_operator").in("id", filters.operator_ids.map(id => parseInt(id)));
      
      let orConditions: string[] = [];
      if (opData && opData.length > 0) {
        opData.forEach(op => {
          orConditions.push(`operator_id.eq.${op.id}`);
          if (op.nama_operator) {
            orConditions.push(`pic.ilike.%${op.nama_operator}%`);
          }
        });
        query = query.or(orConditions.join(","));
      } else {
        query = query.in("operator_id", filters.operator_ids.map(id => parseInt(id)));
      }
    }

    if (filters.design_id) query = query.ilike("design_id", `%${filters.design_id}%`);
    if (filters.potongan_ke) query = query.eq("potongan_ke", parseInt(filters.potongan_ke));
    if (filters.tanggal_potong) query = query.eq("tanggal_potong", filters.tanggal_potong);
    if (filters.no_customer) query = query.ilike("no_customer", `%${filters.no_customer}%`);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching history:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    console.error("Server action error in searchEmployeeHistory:", err);
    return { success: false, error: err.message || "Gagal memuat riwayat." };
  }
}

export async function getEmployeeHistoryDetail(headerId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === "your_supabase_anon_key_here") {
      return { success: false, error: "Database not configured." };
    }

    const supabase = await createClient();
    
    // Fetch Header with relations
    const { data: header, error: headerError } = await supabase
      .from("production_headers")
      .select("*, operators(nama_operator), groups(nama_grup)")
      .eq("id", headerId)
      .single();

    if (headerError) return { success: false, error: headerError.message };

    // Fetch Details
    const { data: details, error: detailsError } = await supabase
      .from("production_details")
      .select("*")
      .eq("header_id", headerId)
      .order("pcs_index", { ascending: true });

    if (detailsError) return { success: false, error: detailsError.message };

    return { 
      success: true, 
      data: {
        ...((header || {}) as Record<string, any>),
        details: details || []
      }
    };
  } catch (err: any) {
    console.error("Server action error in getEmployeeHistoryDetail:", err);
    return { success: false, error: err.message || "Gagal memuat detail riwayat." };
  }
}

export async function updateProductionReport(headerId: string, data: any): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("UPDATE PRODUCTION REPORT DATA:", JSON.stringify(data, null, 2));
    const supabase = await createClient();
    
    // Parse values
    const rpmNum = data.rpm ? parseInt(data.rpm) : null;
    const potonganKeNum = data.potonganKe ? parseInt(data.potonganKe) : null;
    const totalDowntimeNum = data.totalDowntime && parseInt(data.totalDowntime) > 0 ? parseInt(data.totalDowntime) : 0;

    // Cek duplikasi potongan_ke dan panel_no
    if (potonganKeNum && data.panelNo) {
      const { data: existingPanel } = await supabase
        .from("production_headers")
        .select("id")
        .eq("potongan_ke", potonganKeNum)
        .eq("panel_no", data.panelNo)
        .neq("id", headerId)
        .limit(1);

      if (existingPanel && existingPanel.length > 0) {
        return { success: false, error: `Potongan ke-${potonganKeNum} dengan Panel ${data.panelNo} sudah ada!` };
      }
    }

    // 1. Update Header
    const { error: headerError } = await supabase
      .from("production_headers")
      .update({
        operator_id: data.operatorId && data.operatorId.length > 0 ? parseInt(data.operatorId[0]) : null,
        group_id: data.groupId,
        design_id: data.designId,
        nomor_mc: data.nomorMc || null,
        course: data.course || null,
        rpm: rpmNum,
        potongan_ke: potonganKeNum,
        panel_no: data.panelNo || "1",
        pcs: data.pcsData?.length || 0,
        tanggal_potong: data.tanggalPotong || null,
        pick: data.pick || null,
        no_order_barang: data.noOrderBarang || null,
        no_customer: data.noCustomer || null,
        jenis_benang_dasar: data.jenisBenangDasar || null,
        liner: data.liner || null,
        heavy: data.heavy || null,
        shadow: data.shadow || null,
        pinggiran: data.pinggiran || null,
        total_downtime_detik: totalDowntimeNum,
      })
      .eq("id", headerId);

    if (headerError) throw new Error(headerError.message);

    // 2. Delete old details
    const { error: delError } = await supabase
      .from("production_details")
      .delete()
      .eq("header_id", headerId);

    if (delError) throw new Error(delError.message);

    // 3. Insert new details
    if (data.pcsData && data.pcsData.length > 0) {
      const detailData = data.pcsData.map((pcsItem: any, idx: number) => {
        const detailId = generateExcelStyleId() + "-" + idx;
        const jmlHasilNum = pcsItem.jmlHasilProduksi ? parseInt(pcsItem.jmlHasilProduksi) : null;
        const pcsIndexNum = pcsItem.pcsIndex ? parseInt(pcsItem.pcsIndex) : null;

        const kategoriStr = pcsItem.kategoriMasalah && pcsItem.kategoriMasalah.length > 0 
          ? (Array.isArray(pcsItem.kategoriMasalah) ? pcsItem.kategoriMasalah.join(', ') : pcsItem.kategoriMasalah) 
          : null;

        return {
          id: detailId,
          header_id: headerId,
          pcs_index: pcsIndexNum,
          jml_hasil_produksi: jmlHasilNum,
          indikator_stop: pcsItem.indikatorStop || false,
          kategori_masalah: kategoriStr,
          detail_masalah: pcsItem.detailMasalah || null,
          keterangan_cacat: pcsItem.keteranganCacat || null,
          meter_kain: pcsItem.meterKain || null,
          roll_no: pcsItem.rollNo || null,
        };
      });

      const { error: insertError } = await supabase
        .from("production_details")
        .insert(detailData);

      if (insertError) throw new Error(insertError.message);
      
      // Update tanggal_potong massal untuk potongan_ke yang sama
      if (data.tanggalPotong && data.nomorMc && potonganKeNum) {
        // Ambil ID laporan sebelumnya yang terkait
        const { data: previousHeaders } = await supabase
          .from("production_headers")
          .select("*, production_details(*)")
          .eq("nomor_mc", data.nomorMc)
          .eq("potongan_ke", potonganKeNum)
          .neq("id", headerId);

        await supabase
          .from("production_headers")
          .update({ tanggal_potong: data.tanggalPotong })
          .eq("nomor_mc", data.nomorMc)
          .eq("potongan_ke", potonganKeNum);

        // Trigger sinkronisasi update ke Google Sheets untuk panel-panel sebelumnya
        const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;
        if (sheetUrl && previousHeaders && previousHeaders.length > 0) {
          let massPayload: any[] = [];
          for (const h of previousHeaders as any[]) {
            const details = h.production_details || [];
            for (const detail of details) {
              massPayload.push({
                id_header: h.id,
                pcs_index: detail.pcs_index || "",
                tanggal_potong: data.tanggalPotong
              });
            }
          }

          if (massPayload.length > 0) {
            fetch(sheetUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "update", data: massPayload })
            }).catch(err => console.error("Gagal sinkron massal Google Sheets:", err));
          }
        }
      }
      
      const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;
      if (sheetUrl) {
        const payload = detailData.map((detail: any) => ({
          id_header: headerId,
          tanggal_jam: data.tanggalJam || new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date()),
          mesin: data.nomorMc || "",
          pick: data.pick || "",
          course: data.course || "",
          rpm: data.rpm || "",
          operator: data.pic || data.operatorId?.[0] || "",
          grup: data.grupName || data.groupId || "",
          design: data.designName || data.designId || "",
          status_matching: data.statusMatching || "",
          panel: data.panelNo || "",
          potongan_ke: data.potonganKe || "",
          no_order: data.noOrderBarang || "",
          no_customer: data.noCustomer || "",
          total_downtime: data.totalDowntime || 0,
          pcs_index: detail.pcs_index || "",
          jml_hasil: detail.jml_hasil_produksi || 0,
          meter_kain: detail.meter_kain || "",
          roll_no: detail.roll_no || "",
          indikator_stop: detail.indikator_stop ? "Ya" : "Tidak",
          kategori_masalah: detail.kategori_masalah || "",
          detail_masalah: detail.detail_masalah || "",
          keterangan_cacat: detail.keterangan_cacat || "",
          meter_awal: "",
          meter_akhir: "",
          total_produksi_meter: "",
          tanggal_potong: data.tanggalPotong || ""
        }));

        fetch(sheetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update", id_header: headerId, data: payload })
        }).then(async (res) => {
          if (res.ok) {
            const client = await createClient();
            await client.from("production_headers").update({ is_synced_to_sheet: true }).eq("id", headerId);
          }
        }).catch(err => console.error("Gagal sinkron Google Sheets:", err));
      }
    }

    revalidatePath("/(employee)/history");
    return { success: true };
  } catch (err: any) {
    console.error("Error updating report:", err);
    return { success: false, error: err.message || "Gagal memperbarui data laporan." };
  }
}

