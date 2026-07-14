"use server";

import { createClient } from "@/lib/supabase/server";

export interface MonthlyMachineReportData {
  tanggal: number;
  desain: string;
  courses: string;
  rpm: number;
  eff_100: number; // Target
  teamData: Record<string, TeamData>; // Keyed by Group (A, B, C)
}

export interface TeamData {
  operator_name: string;
  hasil_produksi: number;
  jumlah_cacat: number;
  downtime_detik: number;
  kode_tindakan: Record<string, number>; // e.g. { "A": 2, "B": 0 }
}

export async function getMonthlyMachineReport(
  month: number,
  year: number,
  machineId: string
) {
  try {
    const supabase = await createClient();

    // Construct start and end dates for the month
    const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    // Fetch all production details joined with headers for the specific machine and month
    const { data, error } = await supabase
      .from("production_details")
      .select(`
        id,
        jml_hasil_produksi,
        kategori_masalah,
        indikator_stop,
        production_headers!inner (
          id,
          nomor_mc,
          tgl,
          panel_no,
          total_produksi_meter,
          design_id,
          course,
          rpm,
          total_downtime_detik,
          pic,
          groups ( nama_grup ),
          operators ( nama_operator )
        )
      `)
      .eq("production_headers.nomor_mc", machineId)
      .gte("production_headers.tgl", startDate)
      .lte("production_headers.tgl", endDate);

    if (error) {
      console.error("Error fetching report data:", error);
      throw new Error("Gagal mengambil data laporan: " + error.message);
    }

    // Process data to aggregate by date (1-31) and team (A, B, C)
    const reportMap = new Map<number, MonthlyMachineReportData>();

    // Initialize map with all days in the month
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      reportMap.set(d, {
        tanggal: d,
        desain: "",
        courses: "",
        rpm: 0,
        eff_100: 0, // Calculated dynamically
        teamData: {
          "A": createEmptyTeamData(),
          "B": createEmptyTeamData(),
          "C": createEmptyTeamData(),
        },
      });
    }

    // To prevent double counting downtime per header, keep track of processed headers per team
    const processedHeaders = new Set<string>();

    data?.forEach((row: any) => {
      const header = row.production_headers;
      if (!header || !header.tgl) return;

      const dateObj = new Date(header.tgl);
      const day = dateObj.getDate();

      const groupName = header.groups?.nama_grup || "A"; // Default to A if null
      const operatorName = header.operators?.nama_operator || header.pic || "";

      const reportDay = reportMap.get(day);
      if (!reportDay) return;

      // Update shift/day metadata (we take the last one or accumulate, here we just take truthy values)
      if (header.design_id && !reportDay.desain) reportDay.desain = header.design_id;
      if (header.course && !reportDay.courses) reportDay.courses = header.course;
      if (header.rpm && !reportDay.rpm) reportDay.rpm = header.rpm;
      
      // Calculate Eff 100% if rpm and courses are present and valid
      if (reportDay.rpm > 0 && reportDay.courses) {
        const courseNum = parseFloat(reportDay.courses);
        if (!isNaN(courseNum) && courseNum > 0) {
          reportDay.eff_100 = Math.round((reportDay.rpm * 8 * 60) / courseNum);
        }
      }

      // Ensure the team exists in the map
      if (!reportDay.teamData[groupName]) {
        reportDay.teamData[groupName] = createEmptyTeamData();
      }

      const team = reportDay.teamData[groupName];
      if (operatorName && !team.operator_name) {
        team.operator_name = operatorName;
      }

      // Aggregate defects (moved outside so we can still count defects from details)

      // Aggregate defects
      if (row.indikator_stop || row.kategori_masalah) {
        // Count as defect if it's a stop indicator or has a category
        if (row.kategori_masalah && row.kategori_masalah !== "X") {
          team.jumlah_cacat += 1;
          
          // Count categories (A, B, C, D, etc)
          const cats = row.kategori_masalah.split(",").map((c: string) => c.trim().toUpperCase());
          cats.forEach((cat: string) => {
            if (cat.length > 0) {
              const code = cat.replace("KODE ", ""); // Remove "KODE " if exists
              if (!team.kode_tindakan[code]) {
                team.kode_tindakan[code] = 0;
              }
              team.kode_tindakan[code] += 1;
            }
          });
        } else if (row.kategori_masalah === "X") {
           // BS defect
           team.jumlah_cacat += 1;
        }
      }

      // Add downtime and count panels ONLY ONCE per header
      if (!processedHeaders.has(header.id)) {
        processedHeaders.add(header.id);
        team.downtime_detik += (header.total_downtime_detik || 0);
        
        if (header.panel_no === "METERAN") {
          // For meter machines, count as 1 production only if total_produksi_meter exists and > 0
          if (header.total_produksi_meter && header.total_produksi_meter > 0) {
            team.hasil_produksi += 1;
          }
        } else if (header.panel_no) {
          // For normal machines, if panel_no exists, count as 1
          team.hasil_produksi += 1;
        }
      }
    });

    const results = Array.from(reportMap.values());
    
    return { success: true, data: results };

  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

function createEmptyTeamData(): TeamData {
  return {
    operator_name: "",
    hasil_produksi: 0,
    jumlah_cacat: 0,
    downtime_detik: 0,
    kode_tindakan: {
      "A": 0, "B": 0, "C": 0, "D": 0, "E": 0, "F": 0, "G": 0, "H": 0
    }
  };
}
