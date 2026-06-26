"use server";

import { createClient } from "@/lib/supabase/server";

export interface RealProductionItem {
  id: string;
  tanggal: string;
  hari: string;
  header_id: string;
  panel_no?: number;
  potongan_ke?: string;
  nama_operator: string;
  mesin_id: string;
  hasil_pcs: number;
  hasil_meter?: number;
  posisi_meter?: number;
  target_pcs: number;
  status_qc: "Lolos" | "Recheck";
  rpm_mesin: number;
  grade: "GRADE A" | "GRADE B" | "BS" | "UNGRADED";
  design: string;
  group?: string;
  is_production: boolean;
  total_downtime_menit?: number;
  kategori_masalah?: string;
}

const DAYS_MAP = ["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"];

function getHariFromTanggal(tglStr: string): string {
  try {
    const d = new Date(tglStr);
    if (isNaN(d.getTime())) return "SEN";
    return DAYS_MAP[d.getDay()] || "SEN";
  } catch {
    return "SEN";
  }
}

export async function getRealProductionsData(): Promise<{
  success: boolean;
  data?: RealProductionItem[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateLimit = thirtyDaysAgo.toISOString().split("T")[0];

    // Fetch all records with pagination to bypass the 1000 row limit (only last 30 days)
    let rawProductions: any[] = [];
    let hasMore = true;
    let from = 0;
    const step = 1000;

    while (hasMore) {
      const { data, error } = await supabase
        .from("productions")
        .select(`
          id,
          tgl,
          rpm,
          pcs,
          jml_hasil_produksi,
          status_inspeksi,
          operator_id,
          final_inspection_id,
          final_inspections (
            status_final
          ),
          operators (
            nama_operator
          ),
          designs (
            nama_design
          ),
          groups (
            nama_grup
          ),
          production_problems (
            id,
            problems (
              kode_masalah
            )
          )
        `)
        .gte("tgl", dateLimit)
        .order("tgl", { ascending: false })
        .range(from, from + step - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        rawProductions = rawProductions.concat(data);
      }

      if (!data || data.length < step) {
        hasMore = false;
      } else {
        from += step;
      }
    }



    // Map database records to the dashboard Transaction interface
    const mappedData: RealProductionItem[] = [];

    rawProductions.forEach((item: any) => {
      const namaOperator = item.operators?.nama_operator || `Operator #${item.operator_id || 1}`;
      const hasProblems = item.production_problems && item.production_problems.length > 0;

      let grade: "GRADE A" | "GRADE B" | "BS" | "UNGRADED" = "UNGRADED";
      if (item.final_inspections?.status_final) {
        const status = item.final_inspections.status_final.toUpperCase();
        if (status === "GRADE A" || status === "A") {
          grade = "GRADE A";
        } else if (status === "GRADE B" || status === "B") {
          grade = "GRADE B";
        } else if (status === "BS") {
          grade = "BS";
        }
      } else {
        grade = "UNGRADED";
      }

      mappedData.push({
        id: item.id || Math.random().toString(),
        header_id: String(item.id),
        tanggal: item.tgl || new Date().toISOString().split("T")[0],
        hari: getHariFromTanggal(item.tgl),
        panel_no: undefined,
        potongan_ke: undefined,
        nama_operator: namaOperator,
        mesin_id: `KNIT-${(item.operator_id || 1).toString().padStart(3, "0")}`,
        hasil_pcs: item.jml_hasil_produksi || 0,
        hasil_meter: 0,
        target_pcs: item.pcs || 0,
        status_qc: hasProblems ? "Recheck" : "Lolos",
        rpm_mesin: item.rpm || 800,
        grade,
        design: item.designs?.nama_design || "Tanpa Design",
        group: item.groups?.nama_grup || "Tanpa Group",
        is_production: (item.jml_hasil_produksi || 0) > 0,
        kategori_masalah: item.production_problems?.map((p: any) => p.problems?.kode_masalah || "Umum").join(", ") || undefined,
      });
    });

    // --- 2. Fetch Meter Data (from 'production_headers' table) ---

    const { data: rawHeaders, error: headerError } = await (supabase as any)
      .from("production_headers")
      .select(`
        id, tgl, operator_id, rpm, pcs, pic, nomor_mc, total_produksi_meter, total_downtime_menit, design_id, panel_no, potongan_ke,
        groups ( nama_grup ),
        operators ( nama_operator ),
        production_details (
          id, jml_hasil_produksi, kategori_masalah, meter_kain, final_inspection_id
        )
      `)
      .gte("tgl", dateLimit);

    if (headerError) {
      console.error("Dashboard error fetching production_headers:", headerError);
    }

    if (!headerError && rawHeaders && rawHeaders.length > 0) {
      rawHeaders.forEach((header: any) => {
        const namaOperator = header.pic || header.operators?.nama_operator || `Operator #${header.operator_id || 1}`;

        let downtimeAssigned = false;

        // If there's meter input directly on header (old format/continuous), we map it
        if (header.total_produksi_meter) {
          mappedData.push({
            id: `header_meter_${header.id}`,
            header_id: String(header.id),
            panel_no: header.panel_no ? parseInt(header.panel_no) : undefined,
            potongan_ke: header.potongan_ke || undefined,
            tanggal: header.tgl || new Date().toISOString().split("T")[0],
            hari: getHariFromTanggal(header.tgl),
            nama_operator: namaOperator,
            mesin_id: header.nomor_mc || `KNIT-${(header.operator_id || 1).toString().padStart(3, "0")}`,
            hasil_pcs: 0,
            hasil_meter: parseFloat(header.total_produksi_meter),
            target_pcs: 0,
            status_qc: "Lolos",
            rpm_mesin: header.rpm || 800,
            grade: "GRADE A", // Usually continuous is just Grade A
            design: header.design_id || "Tanpa Design",
            group: header.groups?.nama_grup || "Tanpa Group",
            is_production: true,
            total_downtime_menit: header.total_downtime_menit ? parseFloat(header.total_downtime_menit) : 0,
          });
          downtimeAssigned = true;
        }

        if (header.production_details && header.production_details.length > 0) {
          header.production_details.forEach((detail: any, index: number) => {
            const hasProblems = detail.kategori_masalah && detail.kategori_masalah.trim() !== "";
            const isProduction = (detail.jml_hasil_produksi || 0) > 0 || (detail.meter_kain || 0) > 0;

            let grade: "GRADE A" | "GRADE B" | "BS" | "UNGRADED" = "UNGRADED";
            if (detail.final_inspection_id === 1) grade = "GRADE A";
            else if (detail.final_inspection_id === 2) grade = "GRADE B";
            else if (detail.final_inspection_id === 3) grade = "BS";
            else if (detail.final_inspection_id === 4) grade = "GRADE A"; // C = A for now unless specified

            mappedData.push({
              id: detail.id || Math.random().toString(),
              header_id: String(header.id),
              panel_no: header.panel_no ? parseInt(header.panel_no) : undefined,
              potongan_ke: header.potongan_ke || undefined,
              tanggal: header.tgl || new Date().toISOString().split("T")[0],
              hari: getHariFromTanggal(header.tgl),
              nama_operator: namaOperator,
              mesin_id: header.nomor_mc || `KNIT-${(header.operator_id || 1).toString().padStart(3, "0")}`,
              hasil_pcs: detail.jml_hasil_produksi || 0,
              hasil_meter: 0, // Detail rows should NOT add to total_produksi_meter
              posisi_meter: detail.meter_kain ? parseFloat(detail.meter_kain) : 0,
              target_pcs: header.pcs || 0,
              status_qc: hasProblems ? "Recheck" : "Lolos",
              rpm_mesin: header.rpm || 800,
              grade: grade,
              design: header.design_id || "Tanpa Design",
              group: header.groups?.nama_grup || "Tanpa Group",
              is_production: isProduction,
              total_downtime_menit: (!downtimeAssigned && index === 0) ? (header.total_downtime_menit ? parseFloat(header.total_downtime_menit) : 0) : 0,
              kategori_masalah: detail.kategori_masalah || undefined,
            });
          });
        }
      });
    }

    return { success: true, data: mappedData };
  } catch (err: any) {
    console.error("Dashboard server action error:", err);
    return { success: false, error: err.message || "Failed to load live data." };
  }
}
