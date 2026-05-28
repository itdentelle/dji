"use server";

import { createClient } from "@/lib/supabase/server";

export interface RealProductionItem {
  id: string;
  tanggal: string;
  hari: string;
  nama_operator: string;
  mesin_id: string;
  hasil_pcs: number;
  target_pcs: number;
  status_qc: "Lolos" | "Recheck";
  rpm_mesin: number;
  grade: "GRADE A" | "GRADE B" | "BS";
  design: string;
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

    // Query productions joined with operators and final_inspections lookup tables
    const { data: rawProductions, error } = await supabase
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
        )
      `)
      .order("tgl", { ascending: false });

    if (error) {
      throw error;
    }

    if (!rawProductions || rawProductions.length === 0) {
      return { success: true, data: [] };
    }

    // Map database records to the dashboard Transaction interface
    const mappedData: RealProductionItem[] = rawProductions.map((item: any) => {
      const namaOperator = item.operators?.nama_operator || `Operator #${item.operator_id || 1}`;

      // Determine grade from database final_inspections status_final
      let grade: "GRADE A" | "GRADE B" | "BS" = "GRADE A";
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
        // Fallback to status_inspeksi
        grade = item.status_inspeksi === true ? "GRADE A" : "BS";
      }

      return {
        id: item.id || Math.random().toString(),
        tanggal: item.tgl || new Date().toISOString().split("T")[0],
        hari: getHariFromTanggal(item.tgl),
        nama_operator: namaOperator,
        mesin_id: `KNIT-${(item.operator_id || 1).toString().padStart(3, "0")}`,
        hasil_pcs: item.jml_hasil_produksi || 0,
        target_pcs: item.pcs || 0,
        status_qc: item.status_inspeksi === true ? "Lolos" : "Recheck",
        rpm_mesin: item.rpm || 800,
        grade,
        design: item.designs?.nama_design || "Tanpa Design",
      };
    });

    return { success: true, data: mappedData };
  } catch (err: any) {
    console.error("Dashboard server action error:", err);
    return { success: false, error: err.message || "Failed to load live data." };
  }
}

