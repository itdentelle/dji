"use server";

import { continuousFormSchema, ContinuousFormInput } from "@/lib/schemas";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function generateExcelStyleId(): string {
  const chars = "abcdef0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function submitContinuousReport(inputData: ContinuousFormInput) {
  try {
    const validated = continuousFormSchema.parse(inputData);

    const now = new Date();
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
    const tanggalJam = formatter.format(now);
    const tgl = tanggalJam.split(" ")[0];

    const rpmNum = validated.rpm ? parseInt(validated.rpm) : null;
    const potonganKeNum = validated.potonganKe ? parseInt(validated.potonganKe) : null;

    const headerId = generateExcelStyleId();
    
    // Hitung total downtime dari semua PCS
    let totalDowntimeMenit = 0;
    if (validated.totalDowntime && parseInt(validated.totalDowntime) > 0) {
      totalDowntimeMenit = parseInt(validated.totalDowntime);
    }

    const headerData = {
      id: headerId,
      tgl,
      tanggal_jam: tanggalJam,
      operator_id: validated.operatorId && validated.operatorId.length > 0 ? parseInt(validated.operatorId[0]) : null,
      group_id: validated.groupId,
      design_id: validated.designId,
      nomor_mc: validated.nomorMc || null,
      status_matching: validated.statusMatching,
      course: validated.course || null,
      rpm: rpmNum,
      potongan_ke: potonganKeNum,
      panel_no: "METERAN", // Keep panel_no since it's back
      pcs: validated.pcsData.length,
      pic: validated.pic || null,
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
      total_downtime_menit: totalDowntimeMenit,
      meter_awal: validated.meterAwal ? parseFloat(validated.meterAwal) : null,
      meter_akhir: validated.meterAkhir ? parseFloat(validated.meterAkhir) : null,
      total_produksi_meter: validated.hasilProduksiMeter ? parseFloat(validated.hasilProduksiMeter) : null,
    };

    const detailData = validated.pcsData.map((pcsItem) => {
      const kategoriStr = pcsItem.kategoriMasalah && pcsItem.kategoriMasalah.length > 0 
        ? pcsItem.kategoriMasalah.join(', ') 
        : null;

      return {
        id: generateExcelStyleId(),
        header_id: headerId,
        pcs_index: parseInt(pcsItem.pcsIndex),
        jml_hasil_produksi: pcsItem.jmlHasilProduksi ? parseInt(pcsItem.jmlHasilProduksi) : null,
        indikator_stop: pcsItem.indikatorStop || false,
        kategori_masalah: kategoriStr,
        detail_masalah: pcsItem.detailMasalah || null,
        keterangan_cacat: pcsItem.keteranganCacat || null,
        meter_kain: pcsItem.meterKain || null,
        roll_no: pcsItem.rollNo || null,
      };
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey && supabaseAnonKey !== "your_supabase_anon_key_here") {
      const supabase = await createAdminClient();

      const { error: headerError } = await supabase
        .from("production_headers" as any)
        .insert(headerData as any);

      if (headerError) throw new Error(`Gagal menyimpan header: ${headerError.message}`);

      if (detailData.length > 0) {
        const { error: detailError } = await supabase
          .from("production_details" as any)
          .insert(detailData as any);

        if (detailError) throw new Error(`Gagal menyimpan detail: ${detailError.message}`);
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
          "Panel": "METERAN",
          "Potongan Ke": validated.potonganKe || "",
          "No Order": validated.noOrderBarang || "",
          "No Customer": validated.noCustomer || "",
          "Total Downtime (Menit)": totalDowntimeMenit || 0,
          "Meter Awal": validated.meterAwal || "",
          "Meter Akhir": validated.meterAkhir || "",
          "Total Produksi Meter": validated.hasilProduksiMeter || "",
          "PCS Ke": detail.pcs_index || "",
          "Hasil PCS": detail.jml_hasil_produksi || 0,
          "Meter Kain": detail.meter_kain || "",
          "Roll No": detail.roll_no || "",
          "Mesin Stop?": detail.indikator_stop ? "Ya" : "Tidak",
          "Kategori Masalah": detail.kategori_masalah || "",
          "Detail Masalah": detail.detail_masalah || "",
          "Keterangan Cacat": detail.keterangan_cacat || ""
        }));

        fetch(sheetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).catch(err => console.error("Gagal sinkron Google Sheets:", err));
      }

      revalidatePath("/(employee)/history");
      return { success: true, productionId: headerId };
    }

    // Fallback/Mock Mode Trigger Google Sheets
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
        "Panel": "METERAN",
        "Potongan Ke": validated.potonganKe || "",
        "No Order": validated.noOrderBarang || "",
        "No Customer": validated.noCustomer || "",
        "Total Downtime (Menit)": totalDowntimeMenit || 0,
        "Meter Awal": validated.meterAwal || "",
        "Meter Akhir": validated.meterAkhir || "",
        "Total Produksi Meter": validated.hasilProduksiMeter || "",
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

    revalidatePath("/(employee)/history");
    return { success: true, productionId: headerId };
  } catch (error: any) {
    console.error("Error submitContinuousReport:", error);
    return { success: false, error: error.message || "Gagal menyimpan data" };
  }
}
export async function updateContinuousReport(headerId: string, data: any): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("UPDATE CONTINUOUS REPORT DATA:", JSON.stringify(data, null, 2));
    const supabase = await createAdminClient();
    
    // Parse values
    const rpmNum = data.rpm ? parseInt(data.rpm) : null;
    const potonganKeNum = data.potonganKe ? parseInt(data.potonganKe) : null;
    const totalDowntimeNum = data.totalDowntime && parseInt(data.totalDowntime) > 0 ? parseInt(data.totalDowntime) : 0;

    // 1. Update Header
    const { error: headerError } = await supabase
      .from("production_headers" as any)
      .update({
        operator_id: data.operatorId && data.operatorId.length > 0 ? parseInt(data.operatorId[0]) : null,
        group_id: data.groupId,
        design_id: data.designId,
        nomor_mc: data.nomorMc || null,
        course: data.course || null,
        rpm: rpmNum,
        potongan_ke: potonganKeNum,
        panel_no: "METERAN",
        pcs: data.pcsData?.length || 0,
        pic: data.pic || null,
        tanggal_potong: data.tanggalPotong || null,
        pick: data.pick || null,
        no_order_barang: data.noOrderBarang || null,
        no_customer: data.noCustomer || null,
        jenis_benang_dasar: data.jenisBenangDasar || null,
        liner: data.liner || null,
        heavy: data.heavy || null,
        shadow: data.shadow || null,
        pinggiran: data.pinggiran || null,
        total_downtime_menit: totalDowntimeNum,
        meter_awal: data.meterAwal ? parseFloat(data.meterAwal) : null,
        meter_akhir: data.meterAkhir ? parseFloat(data.meterAkhir) : null,
        total_produksi_meter: data.hasilProduksiMeter ? parseFloat(data.hasilProduksiMeter) : null,
      })
      .eq("id", headerId);

    if (headerError) throw new Error(headerError.message);

    // 2. Delete old details
    const { error: delError } = await supabase
      .from("production_details" as any)
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
        .from("production_details" as any)
        .insert(detailData);

      if (insertError) throw new Error(insertError.message);
      
      const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;
      if (sheetUrl) {
        const payload = detailData.map((detail: any) => ({
          "ID Laporan": headerId,
          "Tanggal Produksi": data.tgl || new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date()).split(" ")[0],
          "Tanggal & Jam": data.tanggalJam || new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date()),
          "Tanggal Potong": data.tanggalPotong || "",
          "Mesin": data.nomorMc || "",
          "Pick": data.pick || "",
          "Course": data.course || "",
          "RPM": data.rpm || "",
          "Operator": data.pic || data.operatorId?.[0] || "",
          "Grup": data.groupId || "",
          "Design": data.designId || "",
          "Status Matching": data.statusMatching || "",
          "Panel": data.panelNo || "",
          "Potongan Ke": data.potonganKe || "",
          "No Order": data.noOrderBarang || "",
          "No Customer": data.noCustomer || "",
          "Total Downtime (Menit)": data.totalDowntime || 0,
          "Meter Awal": data.meterAwal || "",
          "Meter Akhir": data.meterAkhir || "",
          "Total Produksi Meter": data.hasilProduksiMeter || "",
          "PCS Ke": detail.pcs_index || "",
          "Hasil PCS": detail.jml_hasil_produksi || 0,
          "Meter Kain": detail.meter_kain || "",
          "Roll No": detail.roll_no || "",
          "Mesin Stop?": detail.indikator_stop ? "Ya" : "Tidak",
          "Kategori Masalah": detail.kategori_masalah || "",
          "Detail Masalah": detail.detail_masalah || "",
          "Keterangan Cacat": detail.keterangan_cacat || ""
        }));

        fetch(sheetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update", id_header: headerId, data: payload })
        }).catch(err => console.error("Gagal sinkron Google Sheets:", err));
      }
    }

    revalidatePath("/(employee)/history");
    return { success: true };
  } catch (err: any) {
    console.error("Error updating continuous report:", err);
    return { success: false, error: err.message || "Gagal memperbarui data laporan." };
  }
}
