import { NextResponse } from "next/server";
import { createAdminClient, getAuthenticatedUser } from "@/lib/supabase/server";

export async function POST() {
  try {
    // 🔐 Hanya user yang sudah login yang bisa memicu auto sync
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const sheetUrl = process.env.GOOGLE_SHEET_URL || process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;

    if (!sheetUrl) {
      return NextResponse.json({ error: "Google Sheet URL tidak disetting" }, { status: 500 });
    }

    // OPTIMISTIC LOCK: Tandai langsung sebagai tersinkron untuk menghindari race condition
    // dari tab/device lain yang juga menjalankan auto-sync di detik yang sama.
    const headerIds = headers.map(h => h.id);
    await supabase
      .from("production_headers")
      .update({ is_synced_to_sheet: true })
      .in("id", headerIds);

    for (const header of headers) {
      const payloads = [];
      const details = header.production_details || [];

      let frekuensiBerhenti = 0;
      if (header.downtime_events) {
        try {
          const events = typeof header.downtime_events === 'string' 
            ? JSON.parse(header.downtime_events) 
            : header.downtime_events;
          frekuensiBerhenti = Array.isArray(events) ? events.length : 0;
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
        let downtimeEventsArray: any[] = [];
        if (header.downtime_events) {
          try {
            const events = typeof header.downtime_events === 'string' 
              ? JSON.parse(header.downtime_events) 
              : header.downtime_events;
            downtimeEventsArray = Array.isArray(events) ? events : [];
          } catch(e) {}
        }

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

      // Push ke Google Sheet
      const gSheetRes = await fetch(sheetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloads)
      });

      if (gSheetRes.ok) {
        successCount++;
      } else {
        // ROLLBACK jika gagal
        await supabase
          .from("production_headers")
          .update({ is_synced_to_sheet: false })
          .eq("id", header.id);
      }
    }

    return NextResponse.json({ success: true, count: successCount, total_attempted: headers.length });

  } catch (err: any) {
    console.error("Auto Sync API error:", err);
    return NextResponse.json({ error: err.message || "Internal Error" }, { status: 500 });
  }
}
