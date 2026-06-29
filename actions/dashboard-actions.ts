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
  total_downtime_detik?: number;
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

    // Query 1: Get dashboard view data
    const { data, error } = await supabase
      .from("dashboard_production_view")
      .select("*")
      .gte("tanggal", dateLimit)
      .order("tanggal", { ascending: false });

    if (error) {
      console.error("Dashboard error fetching dashboard_production_view:", error);
      throw error;
    }

    // Query 2: Get the actual operator name (pic) from production_headers
    // The view's nama_operator comes from JOIN on operator_id which can be stale
    const headerIds = [...new Set((data || []).map((item: any) => item.header_id).filter(Boolean))];
    const picMap = new Map<string, string>();

    if (headerIds.length > 0) {
      // Supabase .in() has a limit, batch if needed
      const batchSize = 100;
      for (let i = 0; i < headerIds.length; i += batchSize) {
        const batch = headerIds.slice(i, i + batchSize);
        const { data: headerData } = await supabase
          .from("production_headers")
          .select("id, pic")
          .in("id", batch);
        
        (headerData || []).forEach((h: any) => {
          if (h.pic) picMap.set(h.id, h.pic);
        });
      }
    }

    const mappedData: RealProductionItem[] = (data || []).map((item: any) => {
      const isProduction = (item.hasil_pcs || 0) > 0 || (item.posisi_meter || 0) > 0 || (item.hasil_meter || 0) > 0;
      
      const mesinId = item.mesin_id || `KNIT-001`;
      
      // Use pic from production_headers if available, else fall back to view's nama_operator
      const actualOperator = picMap.get(item.header_id) || item.nama_operator || "Operator Unknown";
      
      return {
        id: item.id || `header_${item.header_id}_${Math.random().toString().slice(2, 8)}`,
        header_id: String(item.header_id),
        panel_no: item.panel_no ? parseInt(item.panel_no) : undefined,
        potongan_ke: item.potongan_ke || undefined,
        tanggal: item.tanggal || new Date().toISOString().split("T")[0],
        hari: getHariFromTanggal(item.tanggal),
        nama_operator: actualOperator,
        mesin_id: mesinId,
        hasil_pcs: item.hasil_pcs || 0,
        hasil_meter: item.hasil_meter || 0,
        posisi_meter: item.posisi_meter || 0,
        target_pcs: item.target_pcs || 0,
        status_qc: item.status_qc as "Lolos" | "Recheck",
        rpm_mesin: item.rpm_mesin || 800,
        grade: item.grade as "GRADE A" | "GRADE B" | "BS" | "UNGRADED",
        design: item.design || "Tanpa Design",
        group: item.group || "Tanpa Group",
        is_production: isProduction,
        total_downtime_detik: item.total_downtime_detik || 0,
        kategori_masalah: item.kategori_masalah || undefined,
      };
    });

    return { success: true, data: mappedData };
  } catch (err: any) {
    console.error("Dashboard server action error:", err);
    return { success: false, error: err.message || "Failed to load live data." };
  }
}

export interface MachineStatus {
  mesin_id: string;
  status: "Beroperasi" | "Idle";
  nama_operator: string;
  design: string;
  last_input_date: string;
}

export async function getMachineStatuses(): Promise<{ success: boolean; data?: MachineStatus[]; error?: string }> {
  try {
    const supabase = await createClient();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateLimit = thirtyDaysAgo.toISOString().split("T")[0];

    // Query production_headers directly to use the `pic` field (actual operator name at input time)
    // instead of the view which joins on operator_id (which can be stale/incorrect)
    const { data, error } = await supabase
      .from("production_headers")
      .select("nomor_mc, tgl, pic, design_id, tanggal_jam")
      .gte("tgl", dateLimit)
      .order("tanggal_jam", { ascending: false });

    if (error) {
      console.error("Error fetching machine statuses:", error);
      throw error;
    }

    const today = new Date().toISOString().split("T")[0];
    
    // Create a map to store the latest record for each machine
    const latestPerMachine = new Map<string, any>();
    
    // Since it's ordered by tanggal_jam desc, the first time we see a nomor_mc, it is its latest record
    (data || []).forEach((row: any) => {
      if (row.nomor_mc && !latestPerMachine.has(row.nomor_mc)) {
        latestPerMachine.set(row.nomor_mc, row);
      }
    });

    const results: MachineStatus[] = [];
    latestPerMachine.forEach((row, mesin_id) => {
      const isBeroperasi = row.tgl === today;
      
      results.push({
        mesin_id,
        status: isBeroperasi ? "Beroperasi" : "Idle",
        nama_operator: row.pic || "-",
        design: row.design_id || "-",
        last_input_date: row.tgl
      });
    });

    // Sort machines alphabetically
    results.sort((a, b) => a.mesin_id.localeCompare(b.mesin_id));

    return { success: true, data: results };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load machine statuses." };
  }
}

