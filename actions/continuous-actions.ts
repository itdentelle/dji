"use server";

import { continuousFormSchema, ContinuousFormInput } from "@/lib/schemas";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function resolveAutomaticMeterStart(input: {
  nomorMc?: string | null;
  designId?: string | null;
  potonganKe?: string | null;
}) {
  const potonganKeNum = input.potonganKe ? parseInt(input.potonganKe) : null;
  if (!input.nomorMc || !potonganKeNum) return 0;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_headers")
    .select("meter_akhir, tanggal_potong, tanggal_jam, panel_no")
    .eq("nomor_mc", input.nomorMc)
    .eq("potongan_ke", potonganKeNum)
    .not("meter_akhir", "is", null)
    .order("tanggal_jam", { ascending: false })
    .limit(1);
  if (error)
    throw new Error("Gagal mengambil meter start otomatis: " + error.message);

  const lastHeader = data?.[0] as any;
  if (!lastHeader) return 0;

  // Jika record terakhir punya tanggal_potong, berarti ada potong kain (potongan baru)
  // maka meter start harus 0
  if (lastHeader.tanggal_potong) {
    return 0;
  }

  // Jika belum ada potong kain, lanjut potongan yang sama
  // meter start = meter finish dari shift sebelumnya
  const lastFinish = parseFloat(lastHeader.meter_akhir as any);
  return Number.isFinite(lastFinish) ? lastFinish : 0;
}

export async function getLastMeterStartByBatch(input: {
  nomorMc?: string | null;
  designId?: string | null;
  potonganKe?: string | null;
}) {
  try {
    const meterStart = await resolveAutomaticMeterStart(input);
    return { success: true, meterStart };
  } catch (error: any) {
    console.error("Error getLastMeterStartByBatch:", error);
    return {
      success: false,
      meterStart: 0,
      error: error.message || "Gagal mengambil meter start",
    };
  }
}

export async function getOriginalT2ATarget(input: {
  nomorMc?: string | null;
  potonganKe?: string | null;
}) {
  try {
    const potonganKeNum = input.potonganKe ? parseInt(input.potonganKe) : null;
    if (!input.nomorMc || !potonganKeNum) return { success: true, originalTarget: null };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("production_headers")
      .select("meter_awal")
      .eq("nomor_mc", input.nomorMc)
      .eq("potongan_ke", potonganKeNum)
      .not("meter_awal", "is", null)
      .order("tanggal_jam", { ascending: true })
      .limit(1);

    if (error) throw new Error(error.message);
    const firstRecord = data?.[0] as any;
    if (!firstRecord) return { success: true, originalTarget: null };

    const target = parseFloat(firstRecord.meter_awal);
    return { success: true, originalTarget: Number.isFinite(target) ? target : null };
  } catch (error: any) {
    console.error("Error getOriginalT2ATarget:", error);
    return { success: false, originalTarget: null };
  }
}

function generateExcelStyleId(): string {
  const chars = "abcdef0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function parseOptionalMeter(value: string | null | undefined): number | null {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }
  const num = parseFloat(String(value));
  return Number.isFinite(num) ? num : null;
}

async function applyT2ACutDateUpdate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    nomorMc: string;
    potonganKeNum: number;
    tanggalPotong: string;
    /** Header yang baru di-insert; baris ini sudah punya tanggal potong di sheet POST */
    excludeHeaderId?: string;
  },
) {
  const { data: allHeaders, error: headersError } = await supabase
    .from("production_headers")
    .select("*, production_details(*)")
    .eq("nomor_mc", input.nomorMc)
    .eq("potongan_ke", input.potonganKeNum);

  if (headersError) {
    throw new Error(
      "Gagal mencari data meteran untuk potong kain: " + headersError.message,
    );
  }

  if (!allHeaders || allHeaders.length === 0) {
    return {
      success: false as const,
      error: `Belum ada data meteran untuk Mesin ${input.nomorMc} Potongan ${input.potonganKeNum}. Potong kain hanya bisa update data yang sudah ada.`,
    };
  }

  const previousHeaders = input.excludeHeaderId
    ? allHeaders.filter((h) => h.id !== input.excludeHeaderId)
    : allHeaders;

  if (!input.excludeHeaderId && previousHeaders.length === 0) {
    return {
      success: false as const,
      error: `Belum ada data meteran untuk Mesin ${input.nomorMc} Potongan ${input.potonganKeNum}. Potong kain hanya bisa update data yang sudah ada.`,
    };
  }

  const { error: cutUpdateError } = await supabase
    .from("production_headers")
    .update({ tanggal_potong: input.tanggalPotong })
    .eq("nomor_mc", input.nomorMc)
    .eq("potongan_ke", input.potonganKeNum);

  if (cutUpdateError) {
    throw new Error("Gagal menyimpan tanggal potong: " + cutUpdateError.message);
  }

  const sheetUrl = process.env.GOOGLE_SHEET_URL || process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;
  if (sheetUrl && previousHeaders.length > 0) {
    type CutSheetHeader = {
      id?: string | null;
      production_details?: { pcs_index?: string | number | null }[];
    };
    const massPayload: {
      id_header: string;
      pcs_index: string | number;
      tanggal_potong: string;
    }[] = [];

    for (const h of previousHeaders as CutSheetHeader[]) {
      const details = h.production_details || [];
      for (const detail of details) {
        massPayload.push({
          id_header: h.id || "",
          pcs_index: detail.pcs_index || "",
          tanggal_potong: input.tanggalPotong,
        });
      }
    }

    if (massPayload.length > 0) {
      fetch(sheetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", data: massPayload }),
      }).catch((err) =>
        console.error("Gagal sinkron tanggal potong Google Sheets:", err),
      );
    }
  }

  return { success: true as const };
}

export async function submitContinuousReport(inputData: ContinuousFormInput) {
  try {
    const validated = continuousFormSchema.parse(inputData);

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
    const tgl = tanggalJam.split(" ")[0];

    const rpmNum = validated.rpm ? parseInt(validated.rpm) : null;
    const potonganKeNum = validated.potonganKe
      ? parseInt(validated.potonganKe)
      : null;
    const finishMeterNum = parseOptionalMeter(validated.meterAkhir);
    const startMeterInput = parseOptionalMeter(validated.meterAwal);
    const autoMeterStart =
      validated.nomorMc === "T2A"
        ? startMeterInput
        : (finishMeterNum !== null
            ? await resolveAutomaticMeterStart({
                nomorMc: validated.nomorMc,
                designId: validated.designId,
                potonganKe: validated.potonganKe,
              })
            : null);

    const totalProduksiMeter =
      finishMeterNum !== null && autoMeterStart !== null
        ? (validated.nomorMc === "T2A" ? autoMeterStart - finishMeterNum : finishMeterNum - autoMeterStart)
        : null;

    if (totalProduksiMeter !== null && totalProduksiMeter < 0) {
      if (validated.nomorMc === "T2A") {
        throw new Error(`Finish Meter (${finishMeterNum}) tidak boleh lebih besar dari Target (${autoMeterStart}).`);
      } else {
        throw new Error(`Finish Meter (${finishMeterNum}) tidak boleh lebih kecil dari Start Meter (${autoMeterStart}).`);
      }
    }

    const headerId = generateExcelStyleId();

    // Hitung total downtime dari array downtimeEvents (jika ada), atau fallback ke input manual lama
    let totalDowntimeMenit = 0;
    if (validated.downtimeEvents && validated.downtimeEvents.length > 0) {
      totalDowntimeMenit = validated.downtimeEvents.reduce((acc, curr) => acc + curr.durasiDetik, 0);
    } else if (validated.totalDowntime && parseInt(validated.totalDowntime) > 0) {
      totalDowntimeMenit = parseInt(validated.totalDowntime);
    }

    const headerData = {
      id: headerId,
      tgl,
      tanggal_jam: tanggalJam,
      operator_id: validated.operatorId && !isNaN(parseInt(validated.operatorId)) ? parseInt(validated.operatorId) : null,
      group_id: parseInt(validated.groupId),
      design_id: validated.designId,
      nomor_mc: validated.nomorMc || null,
      status_matching: validated.statusMatching,
      course: validated.course || null,
      rpm: rpmNum,
      potongan_ke: potonganKeNum,
      panel_no: "METERAN", // Keep panel_no since it's back
      pcs: validated.pcsData.length,
      tanggal_potong: validated.tanggalPotong || null,
      pick: validated.pick || null,
      no_order_barang: validated.noOrderBarang || null,
      no_customer: validated.noCustomer || null,
      jenis_benang_dasar: validated.jenisBenangDasar || null,
      liner: validated.liner || null,
      heavy: validated.heavy || null,
      shadow: validated.shadow || null,
      pinggiran: validated.pinggiran || null,
      foto_before: validated.fotoBefore || null,
      foto_after: validated.fotoAfter || null,
      total_downtime_detik: totalDowntimeMenit,
      meter_awal: autoMeterStart,
      meter_akhir: finishMeterNum,
      total_produksi_meter: totalProduksiMeter,
      idempotency_key: validated.idempotencyKey || null,
      created_by_name: validated.created_by_name || null,
      pic: validated.pic || null,
      downtime_events: validated.downtimeEvents && validated.downtimeEvents.length > 0 ? JSON.stringify(validated.downtimeEvents) : null,
    };

    const pcsDataToProcess = validated.isPanelGagal 
      ? validated.pcsData.filter(pcs => pcs.isBs) 
      : validated.pcsData;

    // Cari index PCS yang akan menampung jml_hasil_produksi (jika ada masalah, pilih PCS tersebut, jika tidak pilih PCS pertama)
    let targetYieldIdx = 0;
    const idxWithProblem = pcsDataToProcess.findIndex((_, idx) => {
      const matchedEvents = validated.downtimeEvents 
        ? validated.downtimeEvents.filter(e => !e.pcsKe || e.pcsKe === "Semua" || e.pcsKe.split(",").map(x => x.trim()).includes((idx + 1).toString()))
        : [];
      return matchedEvents.length > 0 || pcsDataToProcess[idx].isBs;
    });

    if (idxWithProblem !== -1) {
      targetYieldIdx = idxWithProblem;
    }

    const detailData = pcsDataToProcess.map((pcsItem, idx) => {
      // Filter event khusus untuk PCS ini atau "Semua"
      const matchedEvents = validated.downtimeEvents 
        ? validated.downtimeEvents.filter(e => !e.pcsKe || e.pcsKe === "Semua" || e.pcsKe.split(",").map(x => x.trim()).includes((idx + 1).toString()))
        : [];

      let kategoriStr = null;
      let detailStr = null;
      let blokStr = null;
      let indikatorStop = false;

      if (matchedEvents.length > 0) {
        const allCats = new Set<string>();
        const allDetails = new Set<string>();
        const allBloks = new Set<string>();
        
        matchedEvents.forEach((e: any) => {
          if (e.problems && Array.isArray(e.problems)) {
            e.problems.forEach((p: any) => {
              if (p.kategori) allCats.add(p.kategori);
              if (p.blok) allBloks.add(`Blok ${p.blok}`);
              
              let meterForThisPcs = "";
              if (p.meter) {
                if (pcsDataToProcess.length === 1) {
                  meterForThisPcs = p.meter;
                } else {
                  const match = p.meter.match(new RegExp(`PCS ${idx + 1}:\\s*([^,]+)`));
                  if (match) meterForThisPcs = match[1].trim();
                }
              }

              if (p.details && Array.isArray(p.details)) {
                p.details.forEach((d: string) => {
                  let detailText = d;
                  if (meterForThisPcs) {
                    detailText += ` (Titik: ${meterForThisPcs}m)`;
                  }
                  allDetails.add(detailText);
                });
              }
            });
          } else if (e.kategori) {
            allCats.add(e.kategori);
            if (e.detail) allDetails.add(e.detail);
            if (e.blok) allBloks.add(`Blok ${e.blok}`);
          }
        });
        
        kategoriStr = Array.from(allCats).join(", ");
        detailStr = Array.from(allDetails).join(", ");
        blokStr = Array.from(allBloks).join(", ");
        indikatorStop = true;
      }

      if (pcsItem.isBs) {
        kategoriStr = "X";
      }

      let keteranganStr: string | null = null;
      if (blokStr) {
        keteranganStr = blokStr;
      }
      if (validated.jenisLaporan === "Mulai Istirahat") {
        keteranganStr = keteranganStr ? keteranganStr + " [SEBELUM ISTIRAHAT]" : "[SEBELUM ISTIRAHAT]";
      }
      if (validated.jenisLaporan === "Selesai Istirahat") {
        keteranganStr = keteranganStr ? keteranganStr + " [LAPORAN ISTIRAHAT]" : "[LAPORAN ISTIRAHAT]";
      }

      return {
        id: generateExcelStyleId(),
        header_id: headerId,
        pcs_index: parseInt(pcsItem.pcsIndex),
        jml_hasil_produksi: (idx === targetYieldIdx) ? 1 : 0,
        indikator_stop: indikatorStop,
        kategori_masalah: kategoriStr,
        detail_masalah: detailStr,
        spesifik_masalah: null,
        keterangan_cacat: keteranganStr,
        meter_kain: pcsItem.meterKain || null,
        roll_no: pcsItem.rollNo || null,
      };
    });

    // Filter out completely empty rows (no yield and no problems) to prevent cluttering the database and QC table
    const finalDetailData = detailData.filter(d => {
      if (d.jml_hasil_produksi > 0) return true;
      if (d.kategori_masalah || d.detail_masalah || d.keterangan_cacat || d.indikator_stop || d.meter_kain) return true;
      // Untuk mesin METERAN (di mana operator mengisi meterAkhir), kita HARUS menyimpan semua baris PCS
      // (termasuk PCS 2, 3 dst) agar laporan meteran (seperti 70m-100m) tersimpan untuk setiap roll.
      if (validated.meterAkhir) return true;
      return false;
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (
      supabaseUrl &&
      supabaseAnonKey &&
      supabaseAnonKey !== "your_supabase_anon_key_here"
    ) {
      const supabase = await createClient();

      // Ambil nama penanggung jawab berdasarkan akun login
      try {
        if (validated.created_by_name) {
          headerData.created_by_name = validated.created_by_name;
        } else {
          const {
            data: { user },
          } = await supabase.auth.getUser();
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

      const { error: insertHeaderError } = await supabase
        .from("production_headers")
        .insert(headerData);

      if (insertHeaderError) {
        // Jika error kode 23505 (Unique Violation) berarti data ini sudah ada (duplikasi)
        // Kita intercept dan biarkan sukses agar queue lokal klien dihapus
        if (insertHeaderError.code === "23505") {
          console.warn(
            "Idempotency key duplicate detected. Returning success.",
          );
          return { success: true };
        }
        throw new Error(
          "Failed to insert continuous header: " + insertHeaderError.message,
        );
      }
      if (finalDetailData.length > 0) {
        const { error: detailError } = await supabase
          .from("production_details")
          .insert(finalDetailData as any);

        if (detailError)
          throw new Error(`Gagal menyimpan detail: ${detailError.message}`);
      }

      // Update tanggal potong massal untuk semua laporan potongan yang sama
      if (validated.tanggalPotong && validated.nomorMc && potonganKeNum) {
        const cutResult = await applyT2ACutDateUpdate(supabase, {
          nomorMc: validated.nomorMc,
          potonganKeNum,
          tanggalPotong: validated.tanggalPotong,
          excludeHeaderId: headerId,
        });

        if (!cutResult.success) {
          return cutResult;
        }
      }

      // C. Google Sheets sync is now handled exclusively by the background auto-sync cron job
      // to ensure lightning fast UX and prevent duplicate data race conditions.

      revalidatePath("/(employee)/history");
      return { success: true, productionId: headerId };
    }

    // Fallback/Mock Mode Trigger Google Sheets
    const sheetUrlMock = process.env.GOOGLE_SHEET_URL || process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;
    if (sheetUrlMock) {
      const payloadMock = finalDetailData.map((detail: any) => ({
        "ID Laporan": headerId,
        "Tanggal Produksi": tgl || "",
        "Tanggal & Jam": tanggalJam,
        "Tanggal Potong": validated.tanggalPotong || "",
        Mesin: validated.nomorMc || "",
        Pick: validated.pick || "",
        Course: validated.course || "",
        RPM: validated.rpm ?? "",
        Operator: validated.pic || validated.operatorId?.[0] || "",
        Grup: validated.grupName || validated.groupId || "",
        Design: validated.designName || validated.designId || "",
        Panel: "METERAN",
        "Potongan Ke": validated.potonganKe ?? "",
        "No Order": validated.noOrderBarang || "",
        "No Customer": validated.noCustomer || "",
        "Total Downtime (Detik)": totalDowntimeMenit ?? 0,
        "Meter Awal": autoMeterStart ?? "",
        "Meter Akhir": finishMeterNum ?? "",
        "Total Produksi Meter": totalProduksiMeter ?? "",
        "PCS Ke": detail.pcs_index || "",
        "Hasil PCS": detail.jml_hasil_produksi ?? 0,
        "Meter Kain": detail.meter_kain ?? "",
        "Roll No": detail.roll_no || "",
        "Mesin Stop?": detail.indikator_stop ? "Ya" : "Tidak",
        "Kategori Masalah": detail.kategori_masalah || "",
        "Keterangan Cacat": detail.keterangan_cacat || "",
      }));

      fetch(sheetUrlMock, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadMock),
      }).catch((err) => console.error("Gagal sinkron Google Sheets:", err));
    }

    revalidatePath("/(employee)/history");
    return { success: true, productionId: headerId };
  } catch (error: any) {
    console.error("Error submitContinuousReport:", error);
    return { success: false, error: error.message || "Gagal menyimpan data" };
  }
}
export async function updateContinuousReport(
  headerId: string,
  data: any,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(
      "UPDATE CONTINUOUS REPORT DATA:",
      JSON.stringify(data, null, 2),
    );
    const supabase = await createClient();

    // Parse values
    const rpmNum = data.rpm ? parseInt(data.rpm) : null;
    const potonganKeNum = data.potonganKe ? parseInt(data.potonganKe) : null;
    // Hitung total downtime dari array downtimeEvents (jika ada), atau fallback ke input manual lama
    let totalDowntimeNum = 0;
    if (data.downtimeEvents && data.downtimeEvents.length > 0) {
      totalDowntimeNum = data.downtimeEvents.reduce((acc: number, curr: any) => acc + curr.durasiDetik, 0);
    } else if (data.totalDowntime && parseInt(data.totalDowntime) > 0) {
      totalDowntimeNum = parseInt(data.totalDowntime);
    }

    // 1. Update Header
    const { error: headerError } = await supabase
      .from("production_headers")
      .update({
        operator_id:
          data.operatorId && data.operatorId.length > 0 && !isNaN(parseInt(data.operatorId[0]))
            ? parseInt(data.operatorId[0])
            : null,
        group_id: data.groupId,
        design_id: data.designId,
        nomor_mc: data.nomorMc || null,
        course: data.course || null,
        rpm: rpmNum,
        potongan_ke: potonganKeNum,
        panel_no: "METERAN",
        pcs: data.pcsData?.length || 0,
        tanggal_potong: data.tanggalPotong || null,
        pick: data.pick || null,
        pic: data.pic || null,
        created_by_name: data.created_by_name || null,
        no_order_barang: data.noOrderBarang || null,
        no_customer: data.noCustomer || null,
        jenis_benang_dasar: data.jenisBenangDasar || null,
        liner: data.liner || null,
        heavy: data.heavy || null,
        shadow: data.shadow || null,
        pinggiran: data.pinggiran || null,
        total_downtime_detik: totalDowntimeNum,
        downtime_events: data.downtimeEvents && data.downtimeEvents.length > 0 ? JSON.stringify(data.downtimeEvents) : null,
        meter_awal: data.meterAwal ? parseFloat(data.meterAwal) : null,
        meter_akhir: data.meterAkhir ? parseFloat(data.meterAkhir) : null,
        total_produksi_meter: data.hasilProduksiMeter
          ? parseFloat(data.hasilProduksiMeter)
          : null,
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
        const jmlHasilNum = pcsItem.jmlHasilProduksi
          ? parseInt(pcsItem.jmlHasilProduksi)
          : null;
        const pcsIndexNum = pcsItem.pcsIndex
          ? parseInt(pcsItem.pcsIndex)
          : null;

        // Filter event khusus untuk PCS ini atau "Semua"
        const matchedEvents = data.downtimeEvents 
          ? data.downtimeEvents.filter((e: any) => !e.pcsKe || e.pcsKe === "Semua" || e.pcsKe.split(",").map((x: string) => x.trim()).includes((idx + 1).toString()))
          : [];

        let kategoriStr = null;
        let detailStr = null;
        let indikatorStop = false;

        if (matchedEvents.length > 0) {
          const allCats = new Set<string>();
          const allDetails = new Set<string>();
          
          matchedEvents.forEach((e: any) => {
            if (e.problems && Array.isArray(e.problems)) {
              e.problems.forEach((p: any) => {
                if (p.kategori) allCats.add(p.kategori);
                if (p.details && Array.isArray(p.details)) {
                  p.details.forEach((d: string) => allDetails.add(d));
                }
              });
            } else if (e.kategori) {
              allCats.add(e.kategori);
              if (e.detail) allDetails.add(e.detail);
            }
          });
          
          kategoriStr = Array.from(allCats).join(", ");
          detailStr = Array.from(allDetails).join(", ");
          indikatorStop = true;
        }

        return {
          id: detailId,
          header_id: headerId,
          pcs_index: pcsIndexNum,
          jml_hasil_produksi: jmlHasilNum,
          indikator_stop: indikatorStop,
          kategori_masalah: kategoriStr,
          detail_masalah: detailStr,
          keterangan_cacat: null,
          meter_kain: pcsItem.meterKain || null,
          roll_no: pcsItem.rollNo || null,
        };
      });

      const { error: insertError } = await supabase
        .from("production_details")
        .insert(detailData);

      if (insertError) throw new Error(insertError.message);

      const sheetUrl = process.env.GOOGLE_SHEET_URL || process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;
      if (sheetUrl) {
        const payload = detailData.map((detail: any) => ({
          "ID Laporan": headerId,
          "Tanggal Produksi":
            data.tgl ||
            new Intl.DateTimeFormat("sv-SE", {
              timeZone: "Asia/Jakarta",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })
              .format(new Date())
              .split(" ")[0],
          "Tanggal & Jam":
            data.tanggalJam ||
            new Intl.DateTimeFormat("sv-SE", {
              timeZone: "Asia/Jakarta",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            }).format(new Date()),
          "Tanggal Potong": data.tanggalPotong || "",
          Mesin: data.nomorMc || "",
          Pick: data.pick || "",
          Course: data.course || "",
          RPM: data.rpm ?? "",
          Operator: data.pic || data.operatorId?.[0] || "",
          Grup: data.groupId || "",
          Design: data.designId || "",
          "Status Matching": data.statusMatching || "",
          Panel: data.panelNo || "",
          "Potongan Ke": data.potonganKe ?? "",
          "No Order": data.noOrderBarang || "",
          "No Customer": data.noCustomer || "",
          "Total Downtime (Detik)": data.totalDowntime ?? 0,
          "Meter Awal": data.meterAwal ?? "",
          "Meter Akhir": data.meterAkhir ?? "",
          "Total Produksi Meter": data.hasilProduksiMeter ?? "",
          "PCS Ke": detail.pcs_index || "",
          "Hasil PCS": detail.jml_hasil_produksi ?? 0,
          "Meter Kain": detail.meter_kain ?? "",
          "Roll No": detail.roll_no || "",
          "Mesin Stop?": detail.indikator_stop ? "Ya" : "Tidak",
          "Kategori Masalah": detail.kategori_masalah || "",
          "Keterangan Cacat": detail.keterangan_cacat || "",
        }));

        fetch(sheetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            id_header: headerId,
            data: payload,
          }),
        })
          .then(async (res) => {
            if (res.ok) {
              const client = await createClient();
              await client
                .from("production_headers")
                .update({ is_synced_to_sheet: true })
                .eq("id", headerId);
            }
          })
          .catch((err) => console.error("Gagal sinkron Google Sheets:", err));
      }
    }

    revalidatePath("/(employee)/history");
    return { success: true };
  } catch (err: any) {
    console.error("Error updating continuous report:", err);
    return {
      success: false,
      error: err.message || "Gagal memperbarui data laporan.",
    };
  }
}
