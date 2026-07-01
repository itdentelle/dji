import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createAdminClient();

    // Fetch up to 10 pending syncs to avoid timeout
    const { data: headers, error: headersErr } = await supabase
      .from("production_headers")
      .select(`
        *,
        groups(nama_grup),
        operators(nama_operator),
        production_details(*)
      `)
      .or("is_synced_to_sheet.eq.false,is_synced_to_sheet.is.null")
      .order("tanggal_jam", { ascending: true })
      .limit(10);

    if (headersErr) {
      return NextResponse.json({ error: headersErr.message }, { status: 500 });
    }

    if (!headers || headers.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "No pending syncs" });
    }

    let successCount = 0;
    const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;

    if (!sheetUrl) {
      return NextResponse.json({ error: "Google Sheet URL tidak disetting" }, { status: 500 });
    }

    for (const header of headers) {
      const payloads = [];
      const details = header.production_details || [];

      // Jika tidak ada detail (misal qc awal), kirim minimal data
      if (details.length === 0) {
        payloads.push({
          "ID Laporan": header.id,
          "Tanggal Produksi": header.tgl || "",
          "Tanggal & Jam": header.tanggal_jam || "",
          "Tanggal Potong": header.tanggal_potong || "",
          "Mesin": header.nomor_mc || "",
          "Pick": header.pick || "",
          "Course": header.course || "",
          "RPM": header.rpm || "",
          "Operator": header.pic || (header.operators && header.operators.nama_operator) || "",
          "Grup": (header.groups && header.groups.nama_grup) || header.group_id || "",
          "Design": header.design_id || "",
          "Panel": header.panel_no || "",
          "Potongan Ke": header.potongan_ke || "",
          "No Order": header.no_order_barang || "",
          "No Customer": header.no_customer || "",
          "Total Downtime (Detik)": header.total_downtime_detik || 0,
          "Meter Awal": header.meter_awal || "",
          "Meter Akhir": header.meter_akhir || "",
          "Total Produksi Meter": header.total_produksi_meter || "",
          "Penanggung Jawab": header.created_by_name || ""
        });
      } else {
        for (const detail of details) {
          payloads.push({
            "ID Laporan": header.id,
            "Tanggal Produksi": header.tgl || "",
            "Tanggal & Jam": header.tanggal_jam || "",
            "Tanggal Potong": header.tanggal_potong || "",
            "Mesin": header.nomor_mc || "",
            "Pick": header.pick || "",
            "Course": header.course || "",
            "RPM": header.rpm || "",
            "Operator": header.pic || (header.operators && header.operators.nama_operator) || "",
            "Grup": (header.groups && header.groups.nama_grup) || header.group_id || "",
            "Design": header.design_id || "",
            "Panel": header.panel_no || "",
            "Potongan Ke": header.potongan_ke || "",
            "No Order": header.no_order_barang || "",
            "No Customer": header.no_customer || "",
            "Total Downtime (Detik)": header.total_downtime_detik || 0,
            "Meter Awal": header.meter_awal || "",
            "Meter Akhir": header.meter_akhir || "",
            "Total Produksi Meter": header.total_produksi_meter || "",
            "PCS Ke": detail.pcs_index || "",
            "Hasil PCS": detail.jml_hasil_produksi || 0,
            "Meter Kain": detail.meter_kain || "",
            "Roll No": detail.roll_no || "",
            "Mesin Stop?": detail.indikator_stop ? "Ya" : "Tidak",
            "Kategori Masalah": detail.kategori_masalah || "",
            "Detail Masalah": detail.detail_masalah || "",
            "Keterangan Cacat": detail.keterangan_cacat || "",
            "Penanggung Jawab": header.created_by_name || ""
          });
        }
      }

      // Push ke Google Sheet
      const gSheetRes = await fetch(sheetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloads)
      });

      if (gSheetRes.ok) {
        // Update status di Supabase
        await supabase
          .from("production_headers")
          .update({ is_synced_to_sheet: true })
          .eq("id", header.id);
        successCount++;
      }
    }

    return NextResponse.json({ success: true, count: successCount, total_attempted: headers.length });

  } catch (err: any) {
    console.error("Auto Sync API error:", err);
    return NextResponse.json({ error: err.message || "Internal Error" }, { status: 500 });
  }
}
