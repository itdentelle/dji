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
  courses: string;
  rpm: number;
  eff_100: number;
  kode_tindakan: Record<string, number>; // e.g. { "A": 2, "B": 0 }
}

const PROBLEM_DETAILS: Record<string, string[]> = {
  A: ["L1,L2,L3 Benang timbul putus", "Benang lolos", "Bolong corak", "Benang narik/Kendor", "Benang Nyilang", "Perbaikan/Beset benang Dasar", "Benang Kejepit/Jebol/Kusut", "Jalur benang"],
  B: ["Jarum pattern patah/bengkok", "Ganti Jacquard", "Ganti jarum Compoun Nedle, pattern", "Ngampul", "Ganti dari scaloop ke non scaloop atau sebaliknya", "Ngegaris/Stopline", "Keluar Jarum", "Ganti String bar", "Ganti PBO", "Pressan As beam kendor", "Tensi tensioner"],
  C: ["Loading design/Ganti Design", "Perbaikan corak/revisi", "Salah ganti design", "Error design", "Proofing/PCB", "Ganti Pattern Disk", "Ganti pick"],
  D: ["Ganti benang dasar L1/L2", "Salah ganti benang dasar", "Ganti benang Pattern Linner", "Ganti benang Pattern Heavy", "Ganti benang Pattern Shadow", "Ganti benang pattern keseluruhan (L,H,S)", "salah ganti benang pattern", "Ngelancarin", "Over Cone/Rewind", "Tunggu benang dasar dari warping", "Tunggu benang (benang belum datang)"],
  E: ["Error Servo Drive", "Ganti motor servo", "Sensor Benang/Laser Stop", "Perbaikan Eletrik lainnya", "Konsleting", "Perbaikan listrik"],
  F: ["Perbaikan cilynder Angin", "Ganti Bellow", "Perbaikan gear/Take Up Roll", "Ganti rantai/pertensi", "Ganti Black grip roll", "Ganti Oli", "Pelumasan/greace pada mesin", "Ganti Vanbelt", "Perawatan Panel Listrik", "Servis Overhaul"],
  G: ["Hari Libur", "Tidak ada order", "Tunggu info", "Demo", "Bencana/gempa/banjir", "Istirahat selama buka puasa", "Tunggu Sparepart", "Mati Listrik"],
};

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
        production_defects(kategori),
        production_headers!inner (
          id,
          nomor_mc,
          tgl,
          panel_no,
          total_produksi_meter,
          pcs,
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
        teamData: {
          "A": createEmptyTeamData(),
          "B": createEmptyTeamData(),
          "C": createEmptyTeamData(),
        },
      });
    }

    // To prevent double counting downtime per header, keep track of processed headers per team
    const processedHeaders = new Set<string>();
    // To track unique panels and whether they have failed/stopped
    const processedPanels = new Map<string, { countedForTeam: string | null, isFailed: boolean }>();

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

      // Ensure the team exists in the map
      if (!reportDay.teamData[groupName]) {
        reportDay.teamData[groupName] = createEmptyTeamData();
      }

      const team = reportDay.teamData[groupName];
      if (operatorName && !team.operator_name) {
        team.operator_name = operatorName;
      }
      
      // Update team-specific courses, rpm and efficiency
      if (header.course && !team.courses) team.courses = header.course;
      if (header.rpm && !team.rpm) team.rpm = header.rpm;
      
      if (team.rpm > 0 && team.courses) {
        const courseNum = parseFloat(team.courses);
        if (!isNaN(courseNum) && courseNum > 0) {
          team.eff_100 = Math.round((team.rpm * 8 * 60) / courseNum);
        }
      }

      // Aggregate defects (moved outside so we can still count defects from details)

      // Aggregate defects
      let hasDefects = false;
      let defectCountForRow = 0;

      const addDefect = (k: string) => {
         const code = k.replace("KODE ", "");
         if (!team.kode_tindakan[code]) team.kode_tindakan[code] = 0;
         team.kode_tindakan[code] += 1;
         defectCountForRow += 1;
      };

      if (row.production_defects && Array.isArray(row.production_defects) && row.production_defects.length > 0) {
        row.production_defects.forEach((d: any) => {
          if (d.kategori) addDefect(d.kategori);
        });
        hasDefects = true;
      } else if (row.indikator_stop || row.kategori_masalah) {
        if (row.kategori_masalah && row.kategori_masalah !== "X") {
          let cleanD = row.detail_masalah 
            ? String(row.detail_masalah).replace(/\(Titik:\s*[A-Za-z0-9\s.\-]+\)/gi, "").replace(/\|\s*$/, "").replace(/,\s*$/, "").trim()
            : "";
            
          const katsRaw = row.kategori_masalah;
          const kats = katsRaw.split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean);
          
          const processDefect = (k: string, d: string) => {
             if (!d) {
               addDefect(k);
               return;
             }
             const knownDetailsForCat = PROBLEM_DETAILS[k] || [];
             const matchedDetails: string[] = [];
             let remainingD = d;
             const sortedKnown = [...knownDetailsForCat].sort((a, b) => b.length - a.length);
             sortedKnown.forEach(known => {
               if (remainingD.toLowerCase().includes(known.toLowerCase())) {
                 matchedDetails.push(known);
                 remainingD = remainingD.replace(new RegExp(known, "gi"), "");
               }
             });
             
             if (matchedDetails.length > 0) {
               matchedDetails.forEach(() => addDefect(k));
               const customParts = remainingD.split(",").map((s: string) => s.trim()).filter(Boolean);
               customParts.forEach(custom => {
                 const cleanCustom = custom.replace(/^,\s*|\s*,\s*$/g, "").trim();
                 if (cleanCustom) addDefect(k);
               });
             } else {
               const parts = d.split(",").map((s: string) => s.trim()).filter(Boolean);
               if (parts.length === 0) addDefect(k);
               parts.forEach(() => addDefect(k));
             }
          };

          if (kats.length > 0) {
            if (cleanD.includes(" | ")) {
              const catDetails = cleanD.split(" | ");
              for (let i = 0; i < Math.max(kats.length, catDetails.length); i++) {
                const k = kats[i] || "Unknown";
                const d = catDetails[i] || "";
                if (k !== "Unknown") processDefect(k, d);
              }
            } else if (cleanD) {
              if (kats.length === 1) {
                processDefect(kats[0], cleanD);
              } else {
                const dets = cleanD.split(", ");
                if (kats.length === dets.length) {
                  for (let i = 0; i < kats.length; i++) {
                    processDefect(kats[i], dets[i]);
                  }
                } else {
                  dets.forEach((det: string) => {
                    let foundKat = "Unknown";
                    for (const [kat, detList] of Object.entries(PROBLEM_DETAILS || {})) {
                      if ((detList as string[]).some((d: string) => det.toLowerCase().includes(d.toLowerCase()))) {
                        foundKat = kat;
                        break;
                      }
                    }
                    if (foundKat !== "Unknown") {
                      addDefect(foundKat);
                    } else if (kats.length > 0) {
                       addDefect(kats[0]);
                    }
                  });
                }
              }
            } else {
              kats.forEach((k: string) => { if (k) addDefect(k); });
            }
          }
          
          if (defectCountForRow === 0) {
             defectCountForRow = 1;
             if (kats.length > 0) addDefect(kats[0]);
          }
          hasDefects = true;
        } else if (row.kategori_masalah === "X") {
           team.jumlah_cacat += 1;
           hasDefects = true;
        }
      }

      if (hasDefects && defectCountForRow > 0) {
        team.jumlah_cacat += defectCountForRow;
      }

      // Add downtime ONLY ONCE per header
      if (!processedHeaders.has(header.id)) {
        processedHeaders.add(header.id);
        team.downtime_detik += (header.total_downtime_detik || 0);
        
        if (header.panel_no === "METERAN") {
          // For meter machines, add total_produksi_meter ONCE per header
          if (header.total_produksi_meter && header.total_produksi_meter > 0) {
            team.hasil_produksi += header.total_produksi_meter;
          }
        }
      }

      // For normal machines (panel), count unique panels and exclude if failed/stopped
      // For normal machines (panel), count unique panel_no strings per team, ignoring GAGAL and BERHENTI strings
      if (header.panel_no && header.panel_no !== "METERAN") {
        const panelNoStr = String(header.panel_no).toUpperCase();
        
        const isBerhenti = panelNoStr === "BERHENTI";
        const isGagal = panelNoStr.includes("(GAGAL)");
        
        if (!isBerhenti && !isGagal) {
          // Excel logic uses UNIQUE() per group. We simulate this using a Set key.
          const panelKey = `${groupName}-${panelNoStr}`;
          
          if (!processedPanels.has(panelKey)) {
            processedPanels.set(panelKey, { countedForTeam: groupName, isFailed: false });
            team.hasil_produksi += 1;
          }
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
    courses: "",
    rpm: 0,
    eff_100: 0,
    kode_tindakan: {
      "A": 0, "B": 0, "C": 0, "D": 0, "E": 0, "F": 0, "G": 0, "H": 0
    }
  };
}
