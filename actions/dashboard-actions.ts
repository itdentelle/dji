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

    // The view now directly includes created_by_name and pic

    const mappedData: RealProductionItem[] = (data || []).map((item: any) => {
      const isProduction = (item.hasil_pcs || 0) > 0 || (item.posisi_meter || 0) > 0 || (item.hasil_meter || 0) > 0;
      
      const mesinId = item.mesin_id || `KNIT-001`;
      
      const actualOperator = item.created_by_name || item.pic || item.nama_operator || "Operator Unknown";
      
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
  status: "Beroperasi" | "Idle" | "Tidak Aktif";
  nama_operator: string;
  design: string;
  last_input_date: string;
  last_input_time?: string;
}

export async function getMachineStatuses(): Promise<{ success: boolean; data?: MachineStatus[]; error?: string }> {
  try {
    const supabase = await createClient();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateLimit = thirtyDaysAgo.toISOString().split("T")[0];

    // Query production_headers and join operators to get the operator's name
    const { data, error } = await supabase
      .from("production_headers")
      .select("nomor_mc, tgl, design_id, tanggal_jam, operators(nama_operator), created_by_name, pic")
      .gte("tgl", dateLimit)
      .order("tanggal_jam", { ascending: false });

    if (error) {
      console.error("Error fetching machine statuses:", error);
      throw error;
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    
    // Create a map to store the latest record for each machine from DB
    const latestPerMachine = new Map<string, any>();
    (data || []).forEach((row: any) => {
      if (row.nomor_mc && !latestPerMachine.has(row.nomor_mc)) {
        latestPerMachine.set(row.nomor_mc, row);
      }
    });

    const ALL_MACHINES = ["R1", "R2", "R3B", "R1C", "R2C", "R11", "R12", "R16", "T1C", "T2A", "Warping D6", "Winding"];
    
    const results: MachineStatus[] = ALL_MACHINES.map((mesin_id) => {
      const row = latestPerMachine.get(mesin_id);
      
      if (!row) {
        return {
          mesin_id,
          status: "Tidak Aktif",
          nama_operator: "-",
          design: "-",
          last_input_date: "-",
          last_input_time: "-"
        };
      }

      let lastTime = "-";
      let status: "Beroperasi" | "Idle" | "Tidak Aktif" = "Tidak Aktif";

      if (row.tanggal_jam) {
        const dateObj = new Date(row.tanggal_jam);
        if (!isNaN(dateObj.getTime())) {
          lastTime = dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/:/g, ".");
          
          const diffMs = now.getTime() - dateObj.getTime();
          const diffMinutes = Math.floor(diffMs / 60000);
          
          if (row.tgl === today) {
            if (diffMinutes <= 10) {
              status = "Beroperasi";
            } else {
              status = "Idle";
            }
          } else {
            status = "Tidak Aktif";
          }
        } else {
          lastTime = row.tanggal_jam.split(/[ T]/)[1]?.slice(0, 5) || "-";
          status = row.tgl === today ? "Idle" : "Tidak Aktif";
        }
      }
      
      return {
        mesin_id,
        status,
        nama_operator: row.created_by_name || row.pic || (row.operators as any)?.nama_operator || "-",
        design: row.design_id || "-",
        last_input_date: row.tgl,
        last_input_time: lastTime
      };
    });

    // Sort machines alphabetically
    results.sort((a, b) => a.mesin_id.localeCompare(b.mesin_id));

    return { success: true, data: results };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load machine statuses." };
  }
}

