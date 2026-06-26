import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { headerId } = await req.json();

    if (!headerId) {
      return NextResponse.json({ error: "Missing headerId" }, { status: 400 });
    }

    const supabase = await createAdminClient();

    const { data, error: headerErr } = await supabase
      .from("production_headers" as any)
      .select(`
        *,
        groups(nama_grup),
        operators(nama_operator),
        production_details(*)
      `)
      .eq("id", headerId)
      .single();

    const header: any = data;

    if (headerErr || !header) {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }

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
        "Total Downtime (Menit)": header.total_downtime_menit || 0,
        "Meter Awal": header.meter_awal || "",
        "Meter Akhir": header.meter_akhir || "",
        "Total Produksi Meter": header.total_produksi_meter || ""
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
          "Total Downtime (Menit)": header.total_downtime_menit || 0,
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
          "Keterangan Cacat": detail.keterangan_cacat || ""
        });
      }
    }

    const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;
    if (!sheetUrl) {
      return NextResponse.json({ error: "Google Sheet URL tidak disetting" }, { status: 500 });
    }

    // Push ke Google Sheet
    const gSheetRes = await fetch(sheetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloads)
    });

    if (!gSheetRes.ok) {
      return NextResponse.json({ error: "Gagal terhubung ke Google Sheets" }, { status: 500 });
    }

    // Update status di Supabase
    await supabase
      .from("production_headers" as any)
      .update({ is_synced_to_sheet: true })
      .eq("id", headerId);

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("Sync API error:", err);
    return NextResponse.json({ error: err.message || "Internal Error" }, { status: 500 });
  }
}
