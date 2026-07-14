import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getAuthenticatedUser } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    // 🔐 Hanya user yang sudah login yang bisa memicu sync
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    let frekuensiBerhenti = 0;
    let downtimeEventsArray: any[] = [];
    if (header.downtime_events) {
      try {
        const events = typeof header.downtime_events === 'string' 
          ? JSON.parse(header.downtime_events) 
          : header.downtime_events;
        downtimeEventsArray = Array.isArray(events) ? events : [];
        frekuensiBerhenti = downtimeEventsArray.length;
      } catch (e) {
        // ignore
      }
    }

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
        "RPM": header.rpm ?? "",
        "Operator": header.pic || (header.operators && header.operators.nama_operator) || "",
        "Grup": (header.groups && header.groups.nama_grup) || header.group_id || "",
        "Design": header.design_id || "",
        "Status Matching": header.status_matching || "",
        "Panel": header.panel_no || "",
        "Potongan Ke": header.potongan_ke ?? "",
        "No Order": header.no_order_barang || "",
        "No Customer": header.no_customer || "",
        "Total Downtime (Detik)": header.total_downtime_detik ?? 0,
        "Meter Awal": header.meter_awal ?? "",
        "Meter Akhir": header.meter_akhir ?? "",
        "Total Produksi Meter": header.total_produksi_meter ?? "",
        "Frekuensi Masalah": frekuensiBerhenti,
        "Penanggung Jawab": header.created_by_name || ""
      });
    } else {
      for (const detail of details) {
          const pcsIndexStr = String(detail.pcs_index);
          let categoriesSet = new Set<string>();
          let defectSet = new Set<string>();
          let indikatorStop = detail.indikator_stop;

          downtimeEventsArray.forEach(event => {
            const isApplicable = !event.pcsKe || event.pcsKe === "Semua" || event.pcsKe.split(",").map((s:string) => s.trim()).includes(pcsIndexStr);
            if (isApplicable) {
              indikatorStop = true;
              if (event.problems && Array.isArray(event.problems)) {
                event.problems.forEach((prob: any) => {
                  if (prob.kategori) categoriesSet.add(prob.kategori);
                  if (prob.details && Array.isArray(prob.details)) {
                    prob.details.forEach((d: string) => defectSet.add(d));
                  }
                });
              } else if (event.kategori) {
                categoriesSet.add(event.kategori);
                if (event.detail) defectSet.add(event.detail);
              }
            }
          });

          if (detail.kategori_masalah) detail.kategori_masalah.split(",").forEach((s:string) => categoriesSet.add(s.trim()));
          if (detail.keterangan_cacat) detail.keterangan_cacat.split(",").forEach((s:string) => defectSet.add(s.trim()));

          const combinedCategories = Array.from(categoriesSet).filter(Boolean).join(", ");
          const combinedDefects = Array.from(defectSet).filter(Boolean).join(", ");

          payloads.push({
            "ID Laporan": header.id,
            "Tanggal Produksi": header.tgl || "",
            "Tanggal & Jam": header.tanggal_jam || "",
            "Tanggal Potong": header.tanggal_potong || "",
            "Mesin": header.nomor_mc || "",
            "Pick": header.pick || "",
            "Course": header.course || "",
            "RPM": header.rpm ?? "",
            "Operator": header.pic || (header.operators && header.operators.nama_operator) || "",
            "Grup": (header.groups && header.groups.nama_grup) || header.group_id || "",
            "Design": header.design_id || "",
            "Status Matching": header.status_matching || "",
            "Panel": header.panel_no || "",
            "Potongan Ke": header.potongan_ke ?? "",
            "No Order": header.no_order_barang || "",
            "No Customer": header.no_customer || "",
            "Total Downtime (Detik)": header.total_downtime_detik ?? 0,
            "Meter Awal": header.meter_awal ?? "",
            "Meter Akhir": header.meter_akhir ?? "",
            "Total Produksi Meter": header.total_produksi_meter ?? "",
            "PCS Ke": detail.pcs_index || "",
            "Hasil PCS": detail.jml_hasil_produksi ?? 0,
            "Meter Kain": detail.meter_kain ?? "",
            "Roll No": detail.roll_no || "",
            "Mesin Stop?": indikatorStop ? "Ya" : "Tidak",
            "Kategori Masalah": combinedCategories,
            "Detail Masalah": combinedDefects,
            "Spesifik Masalah": detail.spesifik_masalah || "",
            "Keterangan Cacat": detail.keterangan_cacat || "",
            "Frekuensi Masalah": frekuensiBerhenti,
          "Penanggung Jawab": header.created_by_name || ""
        });
      }
    }

    const sheetUrl = process.env.GOOGLE_SHEET_URL || process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;
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
