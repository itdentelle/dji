"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  ArrowUpRight,
  TrendingUp,
  SlidersHorizontal,
  RefreshCw,
  Calendar,
  BarChart2,
  Palette,
  Users,
  AlertTriangle,
  Layers,
  Download,
  FileText,
  Table as TableIcon
} from "lucide-react";
import { getRealProductionsData } from "@/actions/dashboard-actions";

interface Transaction {
  id: string | number;
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
  is_production?: boolean;
  total_downtime_menit?: number;
  kategori_masalah?: string;
}

const dummyData: Transaction[] = [
  { id: 1, header_id: "1", tanggal: "2026-05-18", hari: "SEN", nama_operator: "Budi Santoso", mesin_id: "KNIT-001", hasil_pcs: 240, target_pcs: 250, status_qc: "Lolos", rpm_mesin: 850, grade: "GRADE A", design: "Design A", group: "Grup A" },
  { id: 2, header_id: "2", tanggal: "2026-05-18", hari: "SEN", nama_operator: "Rina Wijaya", mesin_id: "KNIT-003", hasil_pcs: 220, target_pcs: 230, status_qc: "Lolos", rpm_mesin: 840, grade: "GRADE B", design: "Design B", group: "Grup B" },
  { id: 3, header_id: "3", tanggal: "2026-05-19", hari: "SEL", nama_operator: "Siti Rahma", mesin_id: "KNIT-002", hasil_pcs: 180, target_pcs: 200, status_qc: "Recheck", rpm_mesin: 720, grade: "BS", design: "Design A", group: "Grup A" },
  { id: 4, header_id: "4", tanggal: "2026-05-19", hari: "SEL", nama_operator: "Ahmad Fauzi", mesin_id: "KNIT-004", hasil_pcs: 230, target_pcs: 230, status_qc: "Lolos", rpm_mesin: 860, grade: "GRADE A", design: "Design C", group: "Grup C" },
  { id: 5, header_id: "5", tanggal: "2026-05-20", hari: "RAB", nama_operator: "Doni Setiawan", mesin_id: "KNIT-001", hasil_pcs: 250, target_pcs: 250, status_qc: "Lolos", rpm_mesin: 850, grade: "GRADE A", design: "Design A", group: "Grup A" },
  { id: 6, header_id: "6", tanggal: "2026-05-20", hari: "RAB", nama_operator: "Eko Prasetyo", mesin_id: "KNIT-003", hasil_pcs: 190, target_pcs: 210, status_qc: "Recheck", rpm_mesin: 780, grade: "BS", design: "Design B", group: "Grup B" },
  { id: 7, header_id: "7", tanggal: "2026-05-21", hari: "KAM", nama_operator: "Budi Santoso", mesin_id: "KNIT-001", hasil_pcs: 245, target_pcs: 245, status_qc: "Lolos", rpm_mesin: 855, grade: "GRADE A", design: "Design A", group: "Grup A" },
  { id: 8, header_id: "8", tanggal: "2026-05-21", hari: "KAM", nama_operator: "Dewi Lestari", mesin_id: "KNIT-002", hasil_pcs: 235, target_pcs: 240, status_qc: "Lolos", rpm_mesin: 845, grade: "GRADE B", design: "Design C", group: "Grup C" },
  { id: 9, header_id: "9", tanggal: "2026-05-22", hari: "JUM", nama_operator: "Rina Wijaya", mesin_id: "KNIT-003", hasil_pcs: 260, target_pcs: 260, status_qc: "Lolos", rpm_mesin: 860, grade: "GRADE A", design: "Design B", group: "Grup B" },
  { id: 10, header_id: "10", tanggal: "2026-05-22", hari: "JUM", nama_operator: "Siti Rahma", mesin_id: "KNIT-002", hasil_pcs: 170, target_pcs: 200, status_qc: "Recheck", rpm_mesin: 690, grade: "BS", design: "Design A", group: "Grup A" },
  { id: 11, header_id: "11", tanggal: "2026-05-23", hari: "SAB", nama_operator: "Ahmad Fauzi", mesin_id: "KNIT-004", hasil_pcs: 150, target_pcs: 160, status_qc: "Lolos", rpm_mesin: 820, grade: "GRADE B", design: "Design C", group: "Grup C" },
  { id: 12, header_id: "12", tanggal: "2026-05-23", hari: "SAB", nama_operator: "Doni Setiawan", mesin_id: "KNIT-001", hasil_pcs: 140, target_pcs: 140, status_qc: "Lolos", rpm_mesin: 830, grade: "GRADE A", design: "Design A", group: "Grup A" },
  { id: 13, header_id: "13", tanggal: "2026-05-24", hari: "MIN", nama_operator: "Eko Prasetyo", mesin_id: "KNIT-003", hasil_pcs: 120, target_pcs: 130, status_qc: "Lolos", rpm_mesin: 810, grade: "GRADE A", design: "Design B", group: "Grup B" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<"ALL" | "LOLOS" | "EFISIENSI" | "PROBLEMS" | "NOL_PRODUKSI">("ALL");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isLive, setIsLive] = useState(false);

  // Dashboard View Mode (Produksi vs Kehadiran)
  const [dashboardMode, setDashboardMode] = useState<"PRODUKSI" | "KEHADIRAN">("PRODUKSI");

  // Metric Mode State (controls sliders for PCS vs METER)
  const [metricMode, setMetricMode] = useState<"PCS" | "METER">("PCS");

  // Date Filtering State
  const [dateRangeMode, setDateRangeMode] = useState<"ALL" | "TODAY" | "7DAYS" | "CUSTOM">("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Grade breakdown filter for Chart
  const [chartGradeFilter, setChartGradeFilter] = useState<"ALL" | "GRADE_A" | "GRADE_B" | "BS">("ALL");

  // Chart Dimension State
  const [chartGroupBy, setChartGroupBy] = useState<"HARI" | "DESIGN" | "PEGAWAI" | "GROUP" | "KATEGORI">("HARI");

  // Chart Type State
  const [chartType, setChartType] = useState<"BAR" | "LINE">("BAR");

  // Operator Filter State
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [isOperatorDropdownOpen, setIsOperatorDropdownOpen] = useState(false);

  // Rekap Table Expansion State
  const [isRekapExpanded, setIsRekapExpanded] = useState(false);

  // Swipe State for mobile
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const handleTouchEndMetric = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 40) setMetricMode("METER");
    else if (diff < -40) setMetricMode("PCS");
    setTouchStartX(null);
  };

  // Active chart bar for mobile tap
  const [activeChartBar, setActiveChartBar] = useState<number | null>(null);

  // Load real production data from Supabase
  useEffect(() => {
    async function loadLiveData() {
      try {
        const res = await getRealProductionsData();
        console.log("Dashboard Live Data Response:", res);
        if (res.success && res.data) {
          setTransactions(res.data);
          setIsLive(true);
        } else if (!res.success) {
          console.error("Failed to load dashboard data:", res.error);
        }
      } catch (err) {
        console.error("Error calling getRealProductionsData:", err);
      }
    }
    loadLiveData();
  }, []);

  // Unique Operators for Filter Dropdown
  const uniqueOperators = useMemo(() => {
    const ops = new Set(transactions.map(t => t.nama_operator));
    return Array.from(ops).sort();
  }, [transactions]);

  // Filter transactions by date range and operator
  const dateFilteredTransactions = useMemo(() => {
    let result = transactions;

    if (dateRangeMode !== "ALL") {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];

      result = result.filter(item => {
        const itemDate = new Date(item.tanggal);
        if (isNaN(itemDate.getTime())) return true;

        if (dateRangeMode === "TODAY") {
          return item.tanggal === todayStr;
        }

        if (dateRangeMode === "7DAYS") {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          return itemDate >= sevenDaysAgo && itemDate <= now;
        }

        if (dateRangeMode === "CUSTOM") {
          if (!startDate && !endDate) return true;
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;

          if (start && end) {
            end.setHours(23, 59, 59, 999);
            return itemDate >= start && itemDate <= end;
          } else if (start) {
            return itemDate >= start;
          } else if (end) {
            end.setHours(23, 59, 59, 999);
            return itemDate <= end;
          }
        }

        return true;
      });
    }

    if (selectedOperators.length > 0) {
      result = result.filter(item => selectedOperators.includes(item.nama_operator));
    }

    return result;
  }, [transactions, dateRangeMode, startDate, endDate, selectedOperators]);

  // KPI Calculations (Pivot values calculated from active dataset, filtered by grade)
  const stats = useMemo(() => {
    // Apply grade filter to the date-filtered transactions
    let gradeScoped = dateFilteredTransactions;
    if (chartGradeFilter === "GRADE_A") {
      gradeScoped = dateFilteredTransactions.filter(item => item.grade === "GRADE A");
    } else if (chartGradeFilter === "GRADE_B") {
      gradeScoped = dateFilteredTransactions.filter(item => item.grade === "GRADE B");
    } else if (chartGradeFilter === "BS") {
      gradeScoped = dateFilteredTransactions.filter(item => item.grade === "BS");
    }

    const productionOnly = gradeScoped.filter(item => item.is_production);

    const panelMap = new Map<string, number>();
    productionOnly.forEach(item => {
      if ((item.hasil_meter || 0) === 0 && item.potongan_ke) {
        const groupKey = `${item.tanggal}_${item.mesin_id}_${item.potongan_ke}`;
        const currentMax = panelMap.get(groupKey) || 0;
        if (item.panel_no && item.panel_no > currentMax) {
          panelMap.set(groupKey, item.panel_no);
        }
      }
    });
    
    let totalProduksiPanel = 0;
    panelMap.forEach(max => totalProduksiPanel += max);
    const totalProduksi = totalProduksiPanel; // Rename to keep compatibility

    const totalProduksiMeter = productionOnly.reduce((acc, curr) => acc + (parseFloat(curr.hasil_meter as any) || 0), 0);
    const totalTarget = productionOnly.reduce((acc, curr) => acc + curr.target_pcs, 0);
    const totalItems = productionOnly.length;

    // Perhitungan Cacat Produksi (Panel)
    // "menghitung baris panel yang ada kategori masalahnya di baris tsb" -> hitung baris/detail
    const countMasalahPanel = gradeScoped.filter(item => item.status_qc === "Recheck" && item.is_production && (item.hasil_meter || 0) === 0 && (item.posisi_meter || 0) === 0).length;
    const totalPanelValid = totalProduksiPanel; // "dari Y panel"
    const persentaseCacatPanel = totalPanelValid > 0 ? (countMasalahPanel / totalPanelValid) * 100 : 0;

    // Perhitungan Cacat Produksi (Meteran)
    const countMasalahMeteran = gradeScoped.filter(item => item.status_qc === "Recheck" && item.is_production && (item.posisi_meter || 0) > 0).length;
    const persentaseCacatMeteran = totalProduksiMeter > 0 ? (countMasalahMeteran / totalProduksiMeter) * 100 : 0;

    // Perhitungan Efisiensi Waktu Kerja Akumulatif
    // Menghitung jumlah kombinasi Tanggal + Operator_ID (Jumlah Sesi Shift)
    const shiftSessions = new Set(gradeScoped.map(item => item.tanggal + "_" + item.nama_operator)).size;
    const totalMenitTersedia = shiftSessions * 420;
    const totalDowntimeMenit = gradeScoped.reduce((acc, curr) => acc + (curr.total_downtime_menit || 0), 0);
    const totalMenitKerjaEfektif = Math.max(0, totalMenitTersedia - totalDowntimeMenit);
    const efisiensi = totalMenitTersedia > 0 ? (totalMenitKerjaEfektif / totalMenitTersedia) * 100 : 0;

    // Total Masalah Umum (berdasarkan kemunculan kategori masalah)
    let countMasalah = 0;
    gradeScoped.filter(item => item.status_qc === "Recheck" && item.is_production && item.kategori_masalah).forEach(item => {
      const cats = item.kategori_masalah!.split(',').map(c => c.trim()).filter(c => c !== '');
      countMasalah += cats.length;
    });
    
    const countNolProduksi = gradeScoped.filter(item => item.hasil_pcs === 0).length;
    const totalPanel = gradeScoped.length;

    return {
      totalProduksi,
      totalProduksiMeter,
      totalTarget,
      efisiensi,
      countMasalah,
      totalItems,
      totalPanel,
      countNolProduksi,
      countMasalahPanel,
      totalPanelValid,
      persentaseCacatPanel,
      countMasalahMeteran,
      persentaseCacatMeteran,
      totalMenitTersedia,
      totalDowntimeMenit
    };
  }, [dateFilteredTransactions, chartGradeFilter]);

  // Human-readable grade label for KPI card subtitles
  const gradeLabel = useMemo(() => {
    if (chartGradeFilter === "GRADE_A") return "Grade A";
    if (chartGradeFilter === "GRADE_B") return "Grade B";
    if (chartGradeFilter === "BS") return "BS";
    return "Semua";
  }, [chartGradeFilter]);

  // Filter criteria logic
  const filteredData = useMemo(() => {
    switch (activeFilter) {
      case "LOLOS":
        return dateFilteredTransactions.filter(item => item.status_qc === "Lolos");
      case "EFISIENSI":
        // Filter efisiensi optimal (>= 90%)
        return dateFilteredTransactions.filter(item => {
          const ef = item.target_pcs > 0 ? (item.hasil_pcs / item.target_pcs) * 100 : 0;
          return ef >= 90;
        });
      case "PROBLEMS":
        return dateFilteredTransactions.filter(item => item.status_qc === "Recheck" && item.is_production);
      case "NOL_PRODUKSI":
        return dateFilteredTransactions.filter(item => item.hasil_pcs === 0);
      case "ALL":
      default:
        return dateFilteredTransactions;
    }
  }, [activeFilter, dateFilteredTransactions]);

  const categoryBreakdown = useMemo(() => {
    const problemData = dateFilteredTransactions.filter(item => item.status_qc === "Recheck" && item.is_production && item.kategori_masalah);
    const catMap = new Map<string, number>();
    
    problemData.forEach(item => {
      const cats = item.kategori_masalah!.split(',').map(c => c.trim()).filter(c => c !== '');
      cats.forEach(c => {
        catMap.set(c, (catMap.get(c) || 0) + 1);
      });
    });

    const total = Array.from(catMap.values()).reduce((sum, count) => sum + count, 0);
    // Sort alphabetically by category code
    const list = Array.from(catMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    return { list, total };
  }, [dateFilteredTransactions]);

  // Attendance Logic
  const attendanceStats = useMemo(() => {
    // Total registered employees
    const totalPegawai = uniqueOperators.length;

    // Filter transactions strictly by the selected date range to find who was present
    // Note: We use dateFilteredTransactions without selectedOperators filter for attendance
    // to correctly calculate overall attendance.
    let dateScoped = transactions;
    if (dateRangeMode !== "ALL") {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];

      dateScoped = dateScoped.filter(item => {
        const itemDate = new Date(item.tanggal);
        if (isNaN(itemDate.getTime())) return true;
        if (dateRangeMode === "TODAY") return item.tanggal === todayStr;
        if (dateRangeMode === "7DAYS") {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          return itemDate >= sevenDaysAgo && itemDate <= now;
        }
        if (dateRangeMode === "CUSTOM") {
          if (!startDate && !endDate) return true;
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;
          if (start && end) {
            end.setHours(23, 59, 59, 999);
            return itemDate >= start && itemDate <= end;
          } else if (start) return itemDate >= start;
          else if (end) {
            end.setHours(23, 59, 59, 999);
            return itemDate <= end;
          }
        }
        return true;
      });
    }

    const hadirOperators = new Set(dateScoped.map(t => t.nama_operator));
    const countHadir = hadirOperators.size;
    const countTidakHadir = Math.max(0, totalPegawai - countHadir);
    const persentaseHadir = totalPegawai > 0 ? (countHadir / totalPegawai) * 100 : 0;

    const listTidakHadir = uniqueOperators.filter(op => !hadirOperators.has(op));

    return {
      totalPegawai,
      countHadir,
      countTidakHadir,
      persentaseHadir,
      listTidakHadir
    };
  }, [transactions, uniqueOperators, dateRangeMode, startDate, endDate]);

  // Aggregate daily production data for dynamic chart, segmented by grade
  const chartData = useMemo(() => {
    if (activeFilter === "PROBLEMS") {
      return categoryBreakdown.list.map(([cat, count]) => {
         return {
           label: cat,
           gradeA_sum: 0,
           gradeB_sum: 0,
           bs_sum: 0,
           total: count
         };
      });
    }

    let groups: string[] = [];

    if (chartGroupBy === "HARI") {
      groups = ["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"];
    } else if (chartGroupBy === "DESIGN") {
      // Get unique designs, sorted
      const designs = Array.from(new Set(filteredData.map(item => item.design || "Tanpa Design")));
      groups = designs.sort();
    } else if (chartGroupBy === "PEGAWAI") {
      // Get all operators by volume
      const operatorVolume: Record<string, number> = {};
      filteredData.forEach(item => {
        operatorVolume[item.nama_operator] = (operatorVolume[item.nama_operator] || 0) + item.hasil_pcs;
      });
      groups = Object.keys(operatorVolume)
        .sort((a, b) => operatorVolume[b] - operatorVolume[a]);
    } else if (chartGroupBy === "GROUP") {
      const g = Array.from(new Set(filteredData.map(item => item.group || "Tanpa Group")));
      groups = g.sort();
    }

    return groups.map(groupName => {
      let items: Transaction[] = [];
      if (chartGroupBy === "HARI") {
        items = filteredData.filter(item => item.hari === groupName);
      } else if (chartGroupBy === "DESIGN") {
        items = filteredData.filter(item => (item.design || "Tanpa Design") === groupName);
      } else if (chartGroupBy === "PEGAWAI") {
        items = filteredData.filter(item => item.nama_operator === groupName);
      } else if (chartGroupBy === "GROUP") {
        items = filteredData.filter(item => (item.group || "Tanpa Group") === groupName);
      }

      const gradeA_sum = items
        .filter(item => item.grade === "GRADE A")
        .reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : (curr.hasil_meter || 0)), 0);

      const gradeB_sum = items
        .filter(item => item.grade === "GRADE B")
        .reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : (curr.hasil_meter || 0)), 0);

      const bs_sum = items
        .filter(item => item.grade === "BS")
        .reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : (curr.hasil_meter || 0)), 0);

      const total = gradeA_sum + gradeB_sum + bs_sum;

      return {
        label: groupName,
        gradeA_sum,
        gradeB_sum,
        bs_sum,
        total
      };
    });
  }, [filteredData, chartGroupBy, metricMode]);

  const maxChartValue = useMemo(() => {
    if (activeFilter === "PROBLEMS") {
       if (categoryBreakdown.list.length === 0) return 5;
       return Math.max(...categoryBreakdown.list.map(l => l[1]), 5);
    }

    let groups: string[] = [];
    if (chartGroupBy === "HARI") {
      groups = ["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"];
    } else if (chartGroupBy === "DESIGN") {
      groups = Array.from(new Set(dateFilteredTransactions.map(item => item.design || "Tanpa Design")));
    } else if (chartGroupBy === "PEGAWAI") {
      groups = Array.from(new Set(dateFilteredTransactions.map(item => item.nama_operator)));
    } else if (chartGroupBy === "GROUP") {
      groups = Array.from(new Set(dateFilteredTransactions.map(item => item.group || "Tanpa Group")));
    }

    const maxValues = groups.map(groupName => {
      let items: Transaction[] = [];
      if (chartGroupBy === "HARI") {
        items = dateFilteredTransactions.filter(item => item.hari === groupName);
      } else if (chartGroupBy === "DESIGN") {
        items = dateFilteredTransactions.filter(item => (item.design || "Tanpa Design") === groupName);
      } else if (chartGroupBy === "PEGAWAI") {
        items = dateFilteredTransactions.filter(item => item.nama_operator === groupName);
      } else if (chartGroupBy === "GROUP") {
        items = dateFilteredTransactions.filter(item => (item.group || "Tanpa Group") === groupName);
      }
      if (chartGradeFilter === "ALL") {
        const gA = items.filter(i => i.grade === "GRADE A").reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : (curr.hasil_meter || 0)), 0);
        const gB = items.filter(i => i.grade === "GRADE B").reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : (curr.hasil_meter || 0)), 0);
        const bs = items.filter(i => i.grade === "BS").reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : (curr.hasil_meter || 0)), 0);
        return Math.max(gA, gB, bs);
      } else if (chartGradeFilter === "GRADE_A") {
        return items.filter(i => i.grade === "GRADE A").reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : (curr.hasil_meter || 0)), 0);
      } else if (chartGradeFilter === "GRADE_B") {
        return items.filter(i => i.grade === "GRADE B").reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : (curr.hasil_meter || 0)), 0);
      } else if (chartGradeFilter === "BS") {
        return items.filter(i => i.grade === "BS").reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : (curr.hasil_meter || 0)), 0);
      }
      return 0;
    });

    const max = Math.max(...maxValues, 5); // fallback min scale 5 agar batang kecil tetap terlihat
    return max;
  }, [dateFilteredTransactions, chartGroupBy, chartGradeFilter, metricMode]);

  const handleResetFilters = () => {
    setActiveFilter("ALL");
    setChartGradeFilter("ALL");
    setDateRangeMode("ALL");
    setStartDate("");
    setEndDate("");
    setSelectedOperators([]);
    setIsOperatorDropdownOpen(false);
    setMetricMode("PCS");
  };

  // Rekap Data (Group x Hari)
  const rekapData = useMemo(() => {
    const dates = Array.from(new Set(dateFilteredTransactions.map(t => t.tanggal))).sort();
    const groups = Array.from(new Set(dateFilteredTransactions.map(t => t.group || "Tanpa Group"))).sort();

    const data = dates.map(date => {
      const row: any = { tanggal: date };
      let total = 0;
      groups.forEach(group => {
        const sum = dateFilteredTransactions
          .filter(t => t.tanggal === date && (t.group || "Tanpa Group") === group)
          .reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : (curr.hasil_meter || 0)), 0);
        row[group] = sum;
        total += sum;
      });
      row.total = total;
      return row;
    });

    const grandTotals: any = { tanggal: "Total" };
    let absoluteTotal = 0;
    groups.forEach(group => {
      const sum = data.reduce((acc, curr) => acc + (curr[group] as number), 0);
      grandTotals[group] = sum;
      absoluteTotal += sum;
    });
    grandTotals.total = absoluteTotal;

    return { dates, groups, data, grandTotals };
  }, [dateFilteredTransactions, metricMode]);

  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");

    // 1. Sheet Ringkasan (Summary)
    const totalData = dateFilteredTransactions.length;
    let totalPcs = 0;
    let gradeA = 0, gradeB = 0, bs = 0, ungraded = 0;
    let lolos = 0, recheck = 0;

    const operatorMap: Record<string, number> = {};
    const designMap: Record<string, number> = {};
    const groupMap: Record<string, number> = {};

    dateFilteredTransactions.forEach(t => {
      totalPcs += t.hasil_pcs;

      if (t.grade === "GRADE A") gradeA++;
      else if (t.grade === "GRADE B") gradeB++;
      else if (t.grade === "BS") bs++;
      else ungraded++;

      if (t.status_qc === "Lolos") lolos++;
      else if (t.status_qc === "Recheck") recheck++;

      operatorMap[t.nama_operator] = (operatorMap[t.nama_operator] || 0) + t.hasil_pcs;
      const d = t.design || "Tanpa Design";
      designMap[d] = (designMap[d] || 0) + t.hasil_pcs;
      const g = t.group || "Tanpa Group";
      groupMap[g] = (groupMap[g] || 0) + t.hasil_pcs;
    });

    const topOperators = Object.entries(operatorMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topDesigns = Object.entries(designMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const summaryData = [
      ["RINGKASAN LAPORAN PRODUKSI"],
      [],
      ["1. OVERVIEW"],
      ["Total Transaksi (Baris)", totalData],
      ["Total Produksi (Pcs)", totalPcs],
      [],
      ["2. KUALITAS PRODUK (Berdasarkan Panel)"],
      ["Lolos QC", lolos],
      ["Recheck", recheck],
      ["GRADE A", gradeA],
      ["GRADE B", gradeB],
      ["BS", bs],
      ["Belum Diinspeksi", ungraded],
      [],
      ["3. PERFORMA GRUP (Pcs)"],
      ...Object.entries(groupMap).map(([g, val]) => [g, val]),
      [],
      ["4. TOP 5 OPERATOR (Pcs)"],
      ...topOperators.map(([op, val], idx) => [`${idx + 1}. ${op}`, val]),
      [],
      ["5. TOP 5 DESAIN (Pcs)"],
      ...topDesigns.map(([d, val], idx) => [`${idx + 1}. ${d}`, val])
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

    // 2. Sheet Rekap (Original)
    const wsData = [];
    wsData.push(["Tanggal", ...rekapData.groups, "Total"]);
    rekapData.data.forEach(row => {
      wsData.push([row.tanggal, ...rekapData.groups.map(g => row[g]), row.total]);
    });
    wsData.push(["Total", ...rekapData.groups.map(g => rekapData.grandTotals[g]), rekapData.grandTotals.total]);

    const wsRekap = XLSX.utils.aoa_to_sheet(wsData);

    // Create workbook and append sheets
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Laporan");
    XLSX.utils.book_append_sheet(wb, wsRekap, "Rekap Produksi Harian");
    XLSX.writeFile(wb, "Laporan_Produksi.xlsx");
  };

  const handleExportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    await import("jspdf-autotable");

    const doc = new jsPDF();
    doc.text("Rekap Produksi Harian per Grup", 14, 15);

    const head = [["Tanggal", ...rekapData.groups, "Total"]];
    const body = rekapData.data.map(row => [row.tanggal, ...rekapData.groups.map(g => row[g]), row.total]);
    const foot = [["Total", ...rekapData.groups.map(g => rekapData.grandTotals[g]), rekapData.grandTotals.total]];

    (doc as any).autoTable({
      head,
      body,
      foot,
      startY: 20,
      theme: 'grid',
      headStyles: { fillColor: [0, 112, 188] },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      styles: { fontSize: 8 }
    });

    doc.save("Rekap_Produksi_Harian.pdf");
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Header */}
      <div className="bg-white border border-[#e9ecef] rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 relative z-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight flex flex-wrap items-center gap-3 leading-tight">
            <span className="bg-gradient-to-r from-slate-900 via-[#004777] to-[#0070bc] bg-clip-text text-transparent drop-shadow-sm">
              Selamat Datang, {user?.fullName.replace(" (Demo)", "") || "Supervisor"}!
            </span>
            {isLive ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold bg-white border border-sky-100 shadow-[0_2px_10px_-3px_rgba(14,165,233,0.15)] text-[#0070bc] tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.6)] animate-pulse" />
                Live Database
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold bg-white border border-slate-200 shadow-sm text-slate-500 tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Mock Data (Demo)
              </span>
            )}
          </h1>
          <p className="text-slate-500 text-sm sm:text-base font-medium max-w-2xl leading-relaxed">
            Berikut adalah ringkasan hasil produksi.
          </p>
        </div>

        {/* Dashboard Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-full border border-slate-200 shadow-inner z-10 shrink-0">
          <button
            onClick={() => setDashboardMode("PRODUKSI")}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-extrabold transition-all duration-300 cursor-pointer flex items-center gap-2 ${dashboardMode === "PRODUKSI"
              ? "bg-white text-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.08)] text-[#0070bc]"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
          >
            <BarChart2 className="w-4 h-4" />
            Produksi
          </button>
          <button
            onClick={() => setDashboardMode("KEHADIRAN")}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-extrabold transition-all duration-300 cursor-pointer flex items-center gap-2 ${dashboardMode === "KEHADIRAN"
              ? "bg-white text-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.08)] text-emerald-600"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
          >
            <Users className="w-4 h-4" />
            Kehadiran
          </button>
        </div>

        <button
          onClick={handleResetFilters}
          className="relative z-10 flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-[#0070bc] hover:border-sky-200 rounded-full border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 group shrink-0"
          title="Reset Slicer"
        >
          <RefreshCw className="w-4 h-4 transition-transform duration-500 group-hover:rotate-180" />
          Reset Semua
        </button>
      </div>

      {/* Slicers Container */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Date Range Slicer Component (Vercel-style minimal capsule) */}
        <div className="flex-1 flex flex-wrap items-center justify-between gap-4 bg-white border border-[#e9ecef] rounded-[24px] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-400">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mr-2">
              Range Waktu:
            </span>
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-150">
              <button
                onClick={() => setDateRangeMode("ALL")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateRangeMode === "ALL"
                  ? "bg-white text-slate-800 shadow-xs border border-slate-150"
                  : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                Semua Waktu
              </button>
              <button
                onClick={() => setDateRangeMode("TODAY")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateRangeMode === "TODAY"
                  ? "bg-white text-slate-800 shadow-xs border border-slate-150"
                  : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                Hari Ini
              </button>
              <button
                onClick={() => setDateRangeMode("7DAYS")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateRangeMode === "7DAYS"
                  ? "bg-white text-slate-800 shadow-xs border border-slate-150"
                  : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                7 Hari Terakhir
              </button>
              <button
                onClick={() => setDateRangeMode("CUSTOM")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateRangeMode === "CUSTOM"
                  ? "bg-white text-slate-800 shadow-xs border border-slate-150"
                  : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                Kustom
              </button>
            </div>
          </div>

          {/* Custom Calendar Inputs (Only visible when CUSTOM is active) */}
          {dateRangeMode === "CUSTOM" && (
            <div className="flex items-center gap-2 animate-fadeIn">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Mulai:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200/60 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 font-semibold cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Sampai:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200/60 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 font-semibold cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Operator Slicer Component (Multi-Select Checkbox Dropdown) */}
        <div className="flex flex-wrap items-center gap-4 bg-white border border-[#e9ecef] rounded-[24px] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-400">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mr-2">
              Filter Pegawai:
            </span>
            <div className="relative">
              <button
                onClick={() => setIsOperatorDropdownOpen(!isOperatorDropdownOpen)}
                className="bg-slate-50 border border-slate-200/60 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 font-bold cursor-pointer min-w-[170px] flex justify-between items-center"
              >
                <span className="truncate max-w-[130px]">
                  {selectedOperators.length === 0
                    ? "Semua Pegawai"
                    : `${selectedOperators.length} Pegawai Terpilih`}
                </span>
                <span className="text-[9px] ml-2 text-slate-400">▼</span>
              </button>

              {isOperatorDropdownOpen && (
                <div className="absolute top-full mt-2 left-0 w-64 bg-white border border-slate-200 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] z-50 p-3 max-h-[300px] flex flex-col">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase">Pilih Pegawai</span>
                    <button
                      onClick={() => setIsOperatorDropdownOpen(false)}
                      className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 px-2 py-0.5 rounded"
                    >
                      Tutup
                    </button>
                  </div>
                  <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
                    <label className="flex items-center gap-2.5 cursor-pointer p-1.5 hover:bg-slate-50 rounded-lg group">
                      <input
                        type="checkbox"
                        checked={selectedOperators.length === 0}
                        onChange={() => setSelectedOperators([])}
                        className="accent-sky-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className={`text-xs font-bold transition-colors ${selectedOperators.length === 0 ? "text-sky-700" : "text-slate-600 group-hover:text-slate-800"}`}>Semua Pegawai (Reset)</span>
                    </label>
                    <div className="h-px bg-slate-100 my-1" />
                    {uniqueOperators.map(op => (
                      <label key={op} className="flex items-center gap-2.5 cursor-pointer p-1.5 hover:bg-slate-50 rounded-lg group">
                        <input
                          type="checkbox"
                          checked={selectedOperators.includes(op)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOperators(prev => [...prev, op]);
                            } else {
                              setSelectedOperators(prev => prev.filter(o => o !== op));
                            }
                          }}
                          className="accent-sky-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className={`text-xs font-semibold transition-colors ${selectedOperators.includes(op) ? "text-sky-700" : "text-slate-600 group-hover:text-slate-800"}`}>
                          {op}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {dashboardMode === "PRODUKSI" ? (
        <>
          {/* Grid KPI Cards / Slicer Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

            {/* Card 1: Hasil Produksi (Slider Slicer) */}
            <div
              className={`relative overflow-hidden rounded-[24px] h-full min-h-[11rem] group transition-all duration-300 flex flex-col ${activeFilter === "ALL"
                ? "bg-[#004777] shadow-xl scale-[1.03] ring-2 ring-[#0070bc] ring-offset-2"
                : "bg-[#0070bc] shadow-md hover:scale-[1.01]"
                }`}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEndMetric}
            >

              {/* Background decoration */}
              <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-sky-400/20 blur-xl group-hover:scale-125 transition-all duration-300 pointer-events-none" />

              {/* Slide Container */}
              <div
                className="flex h-full w-[200%] transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${metricMode === "PCS" ? 0 : 50}%)` }}
              >
                {/* Slide 0: Total Produksi (PCS) */}
                <div
                  onClick={() => { setActiveFilter("ALL"); setMetricMode("PCS"); }}
                  className="w-1/2 cursor-pointer p-5 flex flex-col justify-between h-full relative text-white"
                >
                  <div className="flex justify-between items-start relative z-10">
                    <span className="text-sky-100 text-[10px] font-bold uppercase tracking-wider">
                      Total Produksi ({gradeLabel})
                    </span>
                    <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white text-[10px] font-bold">
                      All
                    </span>
                  </div>
                  <div className="mt-2 relative z-10">
                    <div className="text-3xl font-black tracking-tight flex items-baseline gap-1">
                      {stats.totalProduksi.toLocaleString()}
                      <span className="text-sm font-semibold opacity-80">Panel</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-sky-200 font-semibold">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Panel (Lembaran)</span>
                    </div>
                  </div>
                </div>

                {/* Slide 1: Total Produksi (Meter) */}
                <div
                  onClick={() => { setActiveFilter("ALL"); setMetricMode("METER"); }}
                  className="w-1/2 cursor-pointer p-5 flex flex-col justify-between h-full relative text-white"
                >
                  <div className="flex justify-between items-start relative z-10">
                    <span className="text-sky-100 text-[10px] font-bold uppercase tracking-wider">
                      Total Produksi ({gradeLabel})
                    </span>
                    <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white text-[10px] font-bold">
                      All
                    </span>
                  </div>
                  <div className="mt-2 relative z-10">
                    <div className="text-3xl font-black tracking-tight flex items-baseline gap-1">
                      {stats.totalProduksiMeter.toLocaleString()}
                      <span className="text-sm font-semibold opacity-80">Meter</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-sky-200 font-semibold">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Bentuk Gulungan</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dots Indicator */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1 z-20" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { setMetricMode("PCS"); }}
                  className="p-3 -m-3 cursor-pointer"
                  title="Geser ke PCS"
                >
                  <div className={`h-1.5 rounded-full transition-all duration-300 ${metricMode === "PCS" ? "w-4 bg-white" : "w-1.5 bg-sky-300/50 hover:bg-sky-200"}`} />
                </button>
                <button
                  onClick={() => { setMetricMode("METER"); }}
                  className="p-3 -m-3 cursor-pointer ml-3"
                  title="Geser ke METER"
                >
                  <div className={`h-1.5 rounded-full transition-all duration-300 ${metricMode === "METER" ? "w-4 bg-white" : "w-1.5 bg-sky-300/50 hover:bg-sky-200"}`} />
                </button>
              </div>
            </div>

            {/* Card 2: Lolos Inspeksi QC (Slider Slicer) */}
            <div
              className={`relative overflow-hidden rounded-[24px] h-full min-h-[11rem] group border transition-all duration-300 flex flex-col ${activeFilter === "LOLOS"
                ? "bg-sky-50/50 border-sky-500 text-slate-800 shadow-md scale-[1.03] ring-2 ring-sky-500"
                : "bg-white border-[#e9ecef] text-slate-800 hover:scale-[1.01] hover:shadow-xs"
                }`}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEndMetric}
            >

              {/* Slide Container */}
              <div
                className="flex h-full w-[200%] transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${metricMode === "PCS" ? 0 : 50}%)` }}
              >
                {/* Slide 0: Cacat Produksi (Panel) */}
                <div
                  onClick={() => { setActiveFilter("LOLOS"); setMetricMode("PCS"); }}
                  className="w-1/2 cursor-pointer p-5 flex flex-col justify-between h-full relative"
                >
                  <div className="flex justify-between items-start relative z-10">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      Cacat Produksi Panel ({gradeLabel})
                    </span>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${activeFilter === "LOLOS" ? "bg-sky-100 text-[#0070bc]" : "bg-slate-100 text-slate-500"
                      }`}>
                      QC
                    </span>
                  </div>
                  <div className="mt-2 relative z-10">
                    <div className="text-3xl font-black tracking-tight text-slate-800">{stats.persentaseCacatPanel.toFixed(1)}%</div>
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-[#0070bc] font-bold">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{stats.countMasalahPanel} pcs cacat dari {stats.totalPanelValid} panel</span>
                    </div>
                  </div>
                </div>

                {/* Slide 1: Cacat Produksi (Meter) */}
                <div
                  onClick={() => { setActiveFilter("LOLOS"); setMetricMode("METER"); }}
                  className="w-1/2 cursor-pointer p-5 flex flex-col justify-between h-full relative"
                >
                  <div className="flex justify-between items-start relative z-10">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      Cacat Produksi Meteran ({gradeLabel})
                    </span>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${activeFilter === "LOLOS" ? "bg-sky-100 text-[#0070bc]" : "bg-slate-100 text-slate-500"
                      }`}>
                      QC
                    </span>
                  </div>
                  <div className="mt-2 relative z-10">
                    <div className="text-3xl font-black tracking-tight text-slate-800">{stats.persentaseCacatMeteran.toFixed(1)}%</div>
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-[#0070bc] font-bold">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{stats.countMasalahMeteran} titik</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dots Indicator */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1 z-20" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { setMetricMode("PCS"); if (activeFilter === "LOLOS") setActiveFilter("LOLOS"); }}
                  className="p-3 -m-3 cursor-pointer"
                  title="Geser ke QC Panel"
                >
                  <div className={`h-1.5 rounded-full transition-all duration-300 ${metricMode === "PCS" ? (activeFilter === "LOLOS" ? "w-4 bg-sky-500" : "w-4 bg-slate-800") : "w-1.5 bg-slate-300 hover:bg-slate-400"}`} />
                </button>
                <button
                  onClick={() => { setMetricMode("METER"); if (activeFilter === "LOLOS") setActiveFilter("LOLOS"); }}
                  className="p-3 -m-3 cursor-pointer ml-3"
                  title="Geser ke QC Meter"
                >
                  <div className={`h-1.5 rounded-full transition-all duration-300 ${metricMode === "METER" ? (activeFilter === "LOLOS" ? "w-4 bg-sky-500" : "w-4 bg-slate-800") : "w-1.5 bg-slate-300 hover:bg-slate-400"}`} />
                </button>
              </div>
            </div>

            {/* Card 3: Efisiensi Waktu Kerja */}
            <div
              onClick={() => setActiveFilter("EFISIENSI")}
              className={`relative overflow-hidden rounded-[24px] h-full min-h-[11rem] border border-[#e9ecef] cursor-pointer p-5 flex flex-col justify-between transition-all duration-300 ${activeFilter === "EFISIENSI"
                ? "bg-emerald-50/40 shadow-[0_8px_30px_rgba(16,185,129,0.12)] text-slate-800"
                : "bg-white hover:shadow-xs text-slate-800"
                }`}
            >
              {activeFilter === "EFISIENSI" && (
                <div className="absolute inset-0 ring-2 ring-emerald-500 rounded-[24px] pointer-events-none" />
              )}
              <div className="flex justify-between items-start relative z-10">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  Efisiensi Waktu Kerja ({gradeLabel})
                </span>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${activeFilter === "EFISIENSI" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                  }`}>
                  %
                </span>
              </div>
              <div className="mt-2 relative z-10">
                <div className="text-3xl font-black tracking-tight text-slate-800">{stats.efisiensi.toFixed(1)}%</div>
                <div className={`flex items-center gap-1.5 mt-1 text-[11px] font-extrabold ${stats.totalDowntimeMenit > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  {stats.totalDowntimeMenit > 0 ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>Terpotong {stats.totalDowntimeMenit} menit (Total {stats.totalMenitTersedia} mnt)</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>0 Menit Terbuang (Total {stats.totalMenitTersedia} mnt)</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Card 4: Masalah */}
            <div
              onClick={() => { setActiveFilter("PROBLEMS"); setMetricMode("PCS"); }}
              className={`relative overflow-hidden rounded-[24px] h-full min-h-[11rem] border border-[#e9ecef] cursor-pointer p-5 flex flex-col justify-between transition-all duration-300 ${activeFilter === "PROBLEMS"
                ? "bg-red-50/40 shadow-[0_8px_30px_rgba(239,68,68,0.12)] text-slate-800"
                : "bg-white hover:shadow-xs text-slate-800"
                }`}
            >
              {activeFilter === "PROBLEMS" && (
                <div className="absolute inset-0 ring-2 ring-red-500 rounded-[24px] pointer-events-none" />
              )}
              <div className="flex justify-between items-start relative z-10">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  Masalah ({gradeLabel})
                </span>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${activeFilter === "PROBLEMS" ? "bg-red-100 text-red-600 animate-pulse" : "bg-slate-100 text-slate-500"
                  }`}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-2 relative z-10">
                <div className="text-3xl font-black tracking-tight text-slate-800">{stats.countMasalah} Masalah</div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-red-600 font-extrabold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span>Butuh Pemeriksaan</span>
                </div>
              </div>
            </div>

          </div>

          {/* Grid Dashboard Visuals */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Dynamic Production Trend Chart */}
            <div className="lg:col-span-2 bg-white border border-[#e9ecef] rounded-[32px] p-6 flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Tren Hasil Produksi & Analisis Kualitas</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    Filter Aktif: <span className="font-extrabold text-[#0070bc] uppercase">{activeFilter}</span>
                  </p>
                </div>

                {/* Chart Control Toggles */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Chart View Toggles */}
                  <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setChartGroupBy("HARI")}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase transition-all cursor-pointer flex items-center gap-1 ${chartGroupBy === "HARI"
                        ? "bg-white text-slate-800 shadow-xs border border-slate-200"
                        : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                      <BarChart2 className="w-3 h-3" /> Hari
                    </button>
                    <button
                      onClick={() => setChartGroupBy("DESIGN")}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase transition-all cursor-pointer flex items-center gap-1 ${chartGroupBy === "DESIGN"
                        ? "bg-white text-slate-800 shadow-xs border border-slate-200"
                        : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                      <Palette className="w-3 h-3" /> Design
                    </button>
                    <button
                      onClick={() => setChartGroupBy("PEGAWAI")}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase transition-all cursor-pointer flex items-center gap-1 ${chartGroupBy === "PEGAWAI"
                        ? "bg-white text-slate-800 shadow-xs border border-slate-200"
                        : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                      <Users className="w-3 h-3" /> Pegawai
                    </button>
                    <button
                      onClick={() => setChartGroupBy("GROUP")}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase transition-all cursor-pointer flex items-center gap-1 ${chartGroupBy === "GROUP"
                        ? "bg-white text-slate-800 shadow-xs border border-slate-200"
                        : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                      <Layers className="w-3 h-3" /> Group
                    </button>
                  </div>

                  {/* Chart Type Toggles */}
                  <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setChartType("BAR")}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase transition-all cursor-pointer ${chartType === "BAR"
                        ? "bg-white text-slate-800 shadow-xs border border-slate-200"
                        : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                      Bar
                    </button>
                    <button
                      onClick={() => setChartType("LINE")}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase transition-all cursor-pointer ${chartType === "LINE"
                        ? "bg-white text-slate-800 shadow-xs border border-slate-200"
                        : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                      Line
                    </button>
                  </div>

                  {/* Grade Slicer Toggles */}
                  <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setChartGradeFilter("ALL")}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase transition-all cursor-pointer ${chartGradeFilter === "ALL"
                        ? "bg-white text-slate-800 shadow-xs border border-slate-200"
                        : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                      Semua
                    </button>
                    <button
                      onClick={() => setChartGradeFilter("GRADE_A")}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase transition-all cursor-pointer ${chartGradeFilter === "GRADE_A"
                        ? "bg-sky-600 text-white shadow-xs"
                        : "text-[#0070bc] hover:bg-sky-50"
                        }`}
                    >
                      Grade A
                    </button>
                    <button
                      onClick={() => setChartGradeFilter("GRADE_B")}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase transition-all cursor-pointer ${chartGradeFilter === "GRADE_B"
                        ? "bg-amber-500 text-white shadow-xs"
                        : "text-amber-700 hover:bg-amber-50"
                        }`}
                    >
                      Grade B
                    </button>
                    <button
                      onClick={() => setChartGradeFilter("BS")}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase transition-all cursor-pointer ${chartGradeFilter === "BS"
                        ? "bg-rose-500 text-white shadow-xs"
                        : "text-rose-700 hover:bg-rose-50"
                        }`}
                    >
                      BS
                    </button>
                  </div>
                </div>
              </div>
              {/* SVG Custom Dynamic Grouped Bar Chart */}
              <div className="flex-1 relative flex flex-col mt-4">
                {(() => {
                  const svgWidth = Math.max(800, chartData.length * 100);
                  const totalWidth = svgWidth - 60; // 40 left padding, 20 right padding
                  return (
                    <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar pb-4 w-full flex flex-col">
                      <div style={{ minWidth: `${svgWidth}px` }} className="relative mx-auto w-full flex-1 min-h-[250px]">
                        <svg viewBox={`0 0 ${svgWidth} 250`} className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                          <defs>
                            <pattern
                              id="diagonalStripes"
                              width="16"
                              height="16"
                              patternTransform="rotate(45)"
                              patternUnits="userSpaceOnUse"
                            >
                              <rect width="8" height="16" fill="#111111" />
                              <rect x="8" width="8" height="16" fill="#444444" />
                            </pattern>
                          </defs>

                          {/* Horizontal grid lines */}
                          <line x1="40" y1="20" x2={svgWidth - 20} y2="20" stroke="#f1f3f5" strokeWidth="1" />
                          <line x1="40" y1="65" x2={svgWidth - 20} y2="65" stroke="#f1f3f5" strokeWidth="1" />
                          <line x1="40" y1="110" x2={svgWidth - 20} y2="110" stroke="#f1f3f5" strokeWidth="1" />
                          <line x1="40" y1="155" x2={svgWidth - 20} y2="155" stroke="#f1f3f5" strokeWidth="1" />
                          <line x1="40" y1="195" x2={svgWidth - 20} y2="195" stroke="#e9ecef" strokeWidth="1.5" />

                          {/* Y-Axis text labels */}
                          <text x="30" y="24" fill="#a1a1aa" fontSize="9" fontWeight="bold" textAnchor="end">{Math.round(maxChartValue)}</text>
                          <text x="30" y="69" fill="#a1a1aa" fontSize="9" fontWeight="bold" textAnchor="end">{Math.round(maxChartValue * 0.75)}</text>
                          <text x="30" y="114" fill="#a1a1aa" fontSize="9" fontWeight="bold" textAnchor="end">{Math.round(maxChartValue * 0.5)}</text>
                          <text x="30" y="159" fill="#a1a1aa" fontSize="9" fontWeight="bold" textAnchor="end">{Math.round(maxChartValue * 0.25)}</text>

                          {/* Polylines for LINE chart */}
                          {chartType === "LINE" && (
                            <>
                              {chartGradeFilter === "ALL" && (
                                <polyline
                                  points={chartData.map((d, index) => {
                                    const spacing = totalWidth / Math.max(chartData.length, 1);
                                    const cx = 40 + (spacing * index) + (spacing / 2);
                                    const h = maxChartValue > 0 ? (d.total / maxChartValue) * 165 : 0;
                                    return `${cx},${195 - Math.max(h, 1.5)}`;
                                  }).join(' ')}
                                  fill="none" stroke="#334155" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                                />
                              )}
                              {chartGradeFilter === "GRADE_A" && (
                                <polyline
                                  points={chartData.map((d, index) => {
                                    const spacing = totalWidth / Math.max(chartData.length, 1);
                                    const cx = 40 + (spacing * index) + (spacing / 2);
                                    const h = maxChartValue > 0 ? (d.gradeA_sum / maxChartValue) * 165 : 0;
                                    return `${cx},${195 - Math.max(h, 1.5)}`;
                                  }).join(' ')}
                                  fill="none" stroke="#0070bc" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                                />
                              )}
                              {chartGradeFilter === "GRADE_B" && (
                                <polyline
                                  points={chartData.map((d, index) => {
                                    const spacing = totalWidth / Math.max(chartData.length, 1);
                                    const cx = 40 + (spacing * index) + (spacing / 2);
                                    const h = maxChartValue > 0 ? (d.gradeB_sum / maxChartValue) * 165 : 0;
                                    return `${cx},${195 - Math.max(h, 1.5)}`;
                                  }).join(' ')}
                                  fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                                />
                              )}
                              {chartGradeFilter === "BS" && (
                                <polyline
                                  points={chartData.map((d, index) => {
                                    const spacing = totalWidth / Math.max(chartData.length, 1);
                                    const cx = 40 + (spacing * index) + (spacing / 2);
                                    const h = maxChartValue > 0 ? (d.bs_sum / maxChartValue) * 165 : 0;
                                    return `${cx},${195 - Math.max(h, 1.5)}`;
                                  }).join(' ')}
                                  fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                                />
                              )}
                            </>
                          )}

                          {/* Bars (Dynamic Groups) */}
                          {chartData.map((d, index) => {
                            const totalBars = chartData.length;
                            // Calculate spacing based on number of bars to keep them aligned
                            const spacing = totalWidth / Math.max(totalBars, 1);
                            // Center align items horizontally
                            const groupCenter = 40 + (spacing * index) + (spacing / 2);

                            // Active state for mobile tap
                            const isActive = activeChartBar === index;

                            // Grouped Rendering Logic
                            if (chartGradeFilter === "ALL") {
                              if (activeFilter === "PROBLEMS") {
                                const hTotal = maxChartValue > 0 ? (d.total / maxChartValue) * 165 : 0;
                                const displayHTotal = Math.max(hTotal, 1.5);
                                const yTotal = 195 - displayHTotal;
                                const barW = 24;
                                const xTotal = groupCenter - 12;

                                return (
                                  <g key={d.label} className="group/bar cursor-pointer" onClick={() => setActiveChartBar(isActive ? null : index)}>
                                    {/* X-Axis Tick */}
                                    {index > 0 && <line x1={40 + spacing * index} y1={195} x2={40 + spacing * index} y2={205} stroke="#cbd5e1" strokeWidth="2" />}
                                    
                                    {/* Hover tool */}
                                    <rect x={40 + spacing * index} y={20} width={spacing} height={175} fill="transparent" className="cursor-pointer" />

                                    {chartType === "BAR" && (
                                      <rect x={xTotal} y={yTotal} width={barW} height={displayHTotal} rx="4" fill="#ef4444" className="transition-all duration-500 ease-out hover:opacity-85 cursor-pointer" />
                                    )}
                                    
                                    {chartType === "BAR" && (
                                      <text x={xTotal + barW / 2} y={yTotal - 4} fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle" className={`transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-0 group-hover/bar:opacity-100"}`}>
                                        {d.total}
                                      </text>
                                    )}

                                    {/* Unified Tooltip for LINE chart */}
                                    {chartType === "LINE" && (
                                      <g className={`transition-opacity duration-200 pointer-events-none ${isActive ? "opacity-100" : "opacity-0 group-hover/bar:opacity-100"}`}>
                                        {/* Crosshair Line */}
                                        <line x1={groupCenter} y1={20} x2={groupCenter} y2={195} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth="1" />
                                        
                                        <rect x={index === 0 ? groupCenter + 5 : (index === chartData.length - 1 ? groupCenter - 55 : groupCenter - 25)} y={20} width={50} height={25} rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" className="shadow-sm" />
                                        <text x={index === 0 ? groupCenter + 30 : (index === chartData.length - 1 ? groupCenter - 30 : groupCenter)} y={35} fill="#1e293b" fontSize="9" fontWeight="extrabold" textAnchor="middle">{`Total: ${d.total}`}</text>
                                      </g>
                                    )}

                                    {/* X-Axis Label */}
                                    <text x={groupCenter} y={220} fill="#94a3b8" fontSize="10" fontWeight="extrabold" textAnchor="middle">
                                      {d.label.length > 12 ? d.label.substring(0, 10) + '...' : d.label}
                                    </text>
                                  </g>
                                );
                              }

                              const hA = maxChartValue > 0 ? (d.gradeA_sum / maxChartValue) * 165 : 0;
                              const hB = maxChartValue > 0 ? (d.gradeB_sum / maxChartValue) * 165 : 0;
                              const hBS = maxChartValue > 0 ? (d.bs_sum / maxChartValue) * 165 : 0;

                              const displayHA = Math.max(hA, 1.5);
                              const displayHB = Math.max(hB, 1.5);
                              const displayHBS = Math.max(hBS, 1.5);

                              const yA = 195 - displayHA;
                              const yB = 195 - displayHB;
                              const yBS = 195 - displayHBS;

                              const barW = 16;
                              const xA = groupCenter - 26;
                              const xB = groupCenter - 8;
                              const xBS = groupCenter + 10;

                              return (
                                <g key={d.label} className="group/bar cursor-pointer" onClick={() => setActiveChartBar(isActive ? null : index)}>
                                  {/* X-Axis Tick Mark for Grouping Clarity */}
                                  {index > 0 && (
                                    <line x1={40 + spacing * index} y1={195} x2={40 + spacing * index} y2={205} stroke="#cbd5e1" strokeWidth="2" />
                                  )}

                                  {/* Hover Tooltip Zone */}
                                  <rect x={40 + spacing * index} y={20} width={spacing} height={175} fill="transparent" className="cursor-pointer" />

                                  {chartType === "BAR" && (
                                    <>
                                      {/* Grade A Section */}
                                      <rect x={xA} y={yA} width={barW} height={displayHA} rx="4" fill="#0070bc" className="transition-all duration-500 ease-out hover:opacity-85 cursor-pointer" />
                                      {/* Grade B Section */}
                                      <rect x={xB} y={yB} width={barW} height={displayHB} rx="4" fill="#f59e0b" className="transition-all duration-500 ease-out hover:opacity-85 cursor-pointer" />
                                      {/* BS Section */}
                                      <rect x={xBS} y={yBS} width={barW} height={displayHBS} rx="4" fill="#ef4444" className="transition-all duration-500 ease-out hover:opacity-85 cursor-pointer" />
                                    </>
                                  )}

                                  {/* Labels on top of bars */}
                                  {chartType === "BAR" && (
                                    <>
                                      <text x={xA + barW / 2} y={yA - 4} fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle" className={`transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-0 group-hover/bar:opacity-100"}`}>
                                        {d.gradeA_sum}
                                      </text>
                                      <text x={xB + barW / 2} y={yB - 4} fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle" className={`transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-0 group-hover/bar:opacity-100"}`}>
                                        {d.gradeB_sum}
                                      </text>
                                      <text x={xBS + barW / 2} y={yBS - 4} fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle" className={`transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-0 group-hover/bar:opacity-100"}`}>
                                        {d.bs_sum}
                                      </text>

                                      {/* Total summary below tooltip */}
                                      <text x={groupCenter} y={12} fill="#1e293b" fontSize="9" fontWeight="extrabold" textAnchor="middle" className={`transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-0 group-hover/bar:opacity-100"}`}>
                                        {d.total > 0 ? `Total: ${d.total}` : ""}
                                      </text>
                                    </>
                                  )}

                                  {/* Unified Tooltip for LINE chart */}
                                  {chartType === "LINE" && (
                                    <g className={`transition-opacity duration-200 pointer-events-none ${isActive ? "opacity-100" : "opacity-0 group-hover/bar:opacity-100"}`}>
                                      {/* Crosshair Line */}
                                      <line x1={groupCenter} y1={20} x2={groupCenter} y2={195} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth="1" />

                                      {/* Tooltip Box */}
                                      <rect x={index === 0 ? groupCenter + 5 : (index === chartData.length - 1 ? groupCenter - 85 : groupCenter - 40)} y={5} width={80} height={55} rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" className="shadow-sm" />

                                      {/* Tooltip Text Data */}
                                      <text x={index === 0 ? groupCenter + 45 : (index === chartData.length - 1 ? groupCenter - 45 : groupCenter)} y={20} fill="#0070bc" fontSize="9" fontWeight="extrabold" textAnchor="middle">Grade A: <tspan fill="#334155">{d.gradeA_sum}</tspan></text>
                                      <text x={index === 0 ? groupCenter + 45 : (index === chartData.length - 1 ? groupCenter - 45 : groupCenter)} y={33} fill="#f59e0b" fontSize="9" fontWeight="extrabold" textAnchor="middle">Grade B: <tspan fill="#334155">{d.gradeB_sum}</tspan></text>
                                      <text x={index === 0 ? groupCenter + 45 : (index === chartData.length - 1 ? groupCenter - 45 : groupCenter)} y={46} fill="#ef4444" fontSize="9" fontWeight="extrabold" textAnchor="middle">BS: <tspan fill="#334155">{d.bs_sum}</tspan></text>
                                      <text x={index === 0 ? groupCenter + 45 : (index === chartData.length - 1 ? groupCenter - 45 : groupCenter)} y={56} fill="#1e293b" fontSize="9" fontWeight="extrabold" textAnchor="middle">{d.total > 0 ? `Total: ${d.total}` : ""}</text>
                                    </g>
                                  )}

                                  {/* X-Axis Label */}
                                  <text x={groupCenter} y={220} fill="#94a3b8" fontSize="10" fontWeight="extrabold" textAnchor="middle">
                                    {d.label.length > 12 ? d.label.substring(0, 10) + '...' : d.label}
                                  </text>
                                </g>
                              );
                            } else {
                              // Single Grade Filter Mode
                              let value = d.total;
                              let barFill = "#111111";

                              if (chartGradeFilter === "GRADE_A") {
                                value = d.gradeA_sum;
                                barFill = "#0070bc";
                              } else if (chartGradeFilter === "GRADE_B") {
                                value = d.gradeB_sum;
                                barFill = "#f59e0b";
                              } else if (chartGradeFilter === "BS") {
                                value = d.bs_sum;
                                barFill = "#ef4444";
                              }

                              const hVal = maxChartValue > 0 ? (value / maxChartValue) * 165 : 0;
                              const displayHVal = Math.max(hVal, 1.5);
                              const yVal = 195 - displayHVal;
                              const barW = 28;
                              const xVal = groupCenter - (barW / 2);

                              return (
                                <g key={d.label} className="group/bar cursor-pointer" onClick={() => setActiveChartBar(isActive ? null : index)}>
                                  {/* X-Axis Tick Mark for Grouping Clarity */}
                                  {index > 0 && (
                                    <line x1={40 + spacing * index} y1={195} x2={40 + spacing * index} y2={205} stroke="#cbd5e1" strokeWidth="2" />
                                  )}

                                  {/* Hover Tooltip Zone */}
                                  <rect x={40 + spacing * index} y={20} width={spacing} height={175} fill="transparent" className="cursor-pointer" />

                                  {chartType === "BAR" && (
                                    <rect x={xVal} y={yVal} width={barW} height={displayHVal} rx="6" fill={barFill} className="transition-all duration-500 ease-out cursor-pointer hover:opacity-85" />
                                  )}

                                  {/* Permanent Value Label on Top (BAR only) */}
                                  {chartType === "BAR" && (
                                    <text x={groupCenter} y={yVal - 6} fill="#475569" fontSize="9" fontWeight="extrabold" textAnchor="middle">
                                      {value}
                                    </text>
                                  )}

                                  {/* Unified Tooltip for LINE chart (Single Mode) */}
                                  {chartType === "LINE" && (
                                    <g className={`transition-opacity duration-200 pointer-events-none ${isActive ? "opacity-100" : "opacity-0 group-hover/bar:opacity-100"}`}>
                                      <line x1={groupCenter} y1={20} x2={groupCenter} y2={195} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth="1" />
                                      <rect x={index === 0 ? groupCenter + 5 : (index === chartData.length - 1 ? groupCenter - 45 : groupCenter - 20)} y={yVal > 40 ? yVal - 30 : yVal + 10} width={40} height={20} rx="4" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" className="shadow-sm" />
                                      <text x={index === 0 ? groupCenter + 25 : (index === chartData.length - 1 ? groupCenter - 25 : groupCenter)} y={yVal > 40 ? yVal - 16 : yVal + 24} fill={barFill} fontSize="10" fontWeight="extrabold" textAnchor="middle">{value}</text>
                                    </g>
                                  )}

                                  {/* X-Axis Label */}
                                  <text x={groupCenter} y="215" fill="#94a3b8" fontSize="9" fontWeight="extrabold" textAnchor="middle">
                                    {d.label.length > 12 ? d.label.substring(0, 10) + '...' : d.label}
                                  </text>
                                </g>
                              );
                            }
                          })}
                        </svg>
                      </div>
                    </div>
                  );
                })()}

                {/* Legend Indicators */}
                <div className="flex flex-wrap items-center justify-center gap-4 pt-3.5 mt-3 border-t border-slate-100/60">
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-600 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-[#0070bc]" />
                    <span>Grade A (Lolos)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-600 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                    <span>Grade B (Lolos)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-600 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                    <span>BS (Recheck)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quality Breakdown Donut Chart */}
            {(() => {
              const totalA = filteredData.filter(i => i.grade === "GRADE A").reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : 1), 0);
              const totalB = filteredData.filter(i => i.grade === "GRADE B").reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : 1), 0);
              const totalBS = filteredData.filter(i => i.grade === "BS").reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : 1), 0);
              const totalQuality = totalA + totalB + totalBS;

              const pctA = totalQuality > 0 ? (totalA / totalQuality) * 100 : 0;
              const pctB = totalQuality > 0 ? (totalB / totalQuality) * 100 : 0;
              const pctBS = totalQuality > 0 ? (totalBS / totalQuality) * 100 : 0;

              if (chartGroupBy === "KATEGORI" || activeFilter === "PROBLEMS") {
                const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#64748b"];
                let cumulativePct = 0;

                return (
                  <div className="space-y-6 flex flex-col flex-1">
                    <div className="bg-white border border-[#e9ecef] rounded-[32px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between flex-1">
                      <div>
                        <div className="border-b border-slate-100 pb-4 mb-6 flex justify-between items-start">
                          <div>
                            <h3 className="text-base font-extrabold text-slate-800">Komposisi Masalah</h3>
                            <p className="text-[11px] text-slate-400 font-semibold">Persentase berdasarkan kategori</p>
                          </div>
                          <span className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 flex items-center gap-1 shrink-0">
                            {categoryBreakdown.total} Laporan
                          </span>
                        </div>

                        {/* Donut Chart Visual */}
                        <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                            {/* Background Track */}
                            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />

                            {categoryBreakdown.list.map(([cat, count], idx) => {
                              const pct = categoryBreakdown.total > 0 ? (count / categoryBreakdown.total) * 100 : 0;
                              if (pct === 0) return null;
                              const strokeDasharray = `${(pct / 100) * 251.2} 251.2`;
                              const strokeDashoffset = -((cumulativePct / 100) * 251.2);
                              cumulativePct += pct;
                              return (
                                <circle key={cat} cx="50" cy="50" r="40" fill="transparent" stroke={COLORS[idx % COLORS.length]} strokeWidth="12"
                                  strokeDasharray={strokeDasharray}
                                  strokeDashoffset={strokeDashoffset}
                                  className="transition-all duration-1000 ease-out"
                                />
                              );
                            })}
                          </svg>
                          {/* Center Content */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-black text-slate-800 tracking-tight">
                              {categoryBreakdown.list.length > 0 ? Math.round((categoryBreakdown.list[0][1] / categoryBreakdown.total) * 100) + '%' : '0%'}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 px-4 truncate w-full text-center">
                              {categoryBreakdown.list.length > 0 ? categoryBreakdown.list[0][0] : 'Tidak ada'}
                            </span>
                          </div>
                        </div>

                        {/* Breakdown List */}
                        <div className="mt-8 space-y-2">
                          {categoryBreakdown.list.slice(0, showAllCategories ? undefined : 3).map(([cat, count], idx) => (
                            <div key={cat} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                              <div className="flex items-center gap-3">
                                <div className="w-3.5 h-3.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.15)]" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                <span className="text-xs font-extrabold text-slate-700 truncate max-w-[110px]" title={cat}>{cat}</span>
                              </div>
                              <div className="text-right flex items-baseline gap-1.5">
                                <span className="text-sm font-black text-slate-800">{count}</span>
                                <span className="text-[10px] text-slate-400 font-bold">Laporan</span>
                              </div>
                            </div>
                          ))}
                          
                          {!showAllCategories && categoryBreakdown.list.length > 3 && (
                            <button 
                              onClick={() => setShowAllCategories(true)}
                              className="w-full mt-2 text-[11px] font-bold text-[#0070bc] hover:text-[#004777] py-2 bg-sky-50 rounded-xl transition-colors text-center"
                            >
                              Lihat Selengkapnya ({categoryBreakdown.list.length - 3} lainnya)
                            </button>
                          )}
                          
                          {showAllCategories && categoryBreakdown.list.length > 3 && (
                            <button 
                              onClick={() => setShowAllCategories(false)}
                              className="w-full mt-2 text-[11px] font-bold text-slate-500 hover:text-slate-700 py-2 bg-slate-50 rounded-xl transition-colors text-center"
                            >
                              Sembunyikan
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-4 mt-6 text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                          Problem Overview
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-6 flex flex-col flex-1">
                  <div className="bg-white border border-[#e9ecef] rounded-[32px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between flex-1">
                    <div>
                      <div className="border-b border-slate-100 pb-4 mb-6 flex justify-between items-start">
                        <div>
                          <h3 className="text-base font-extrabold text-slate-800">Ringkasan Kualitas</h3>
                          <p className="text-[11px] text-slate-400 font-semibold">Persentase barang berdasarkan Grade</p>
                        </div>
                        <span className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 flex items-center gap-1 shrink-0">
                          {totalQuality.toLocaleString()} {metricMode === "PCS" ? "Pcs" : "Baris"}
                        </span>
                      </div>

                      {/* Donut Chart Visual */}
                      <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                          {/* Background Track */}
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />

                          {/* Grade A */}
                          {pctA > 0 && (
                            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#0070bc" strokeWidth="12"
                              strokeDasharray={`${(pctA / 100) * 251.2} 251.2`}
                              strokeDashoffset="0"
                              className="transition-all duration-1000 ease-out"
                            />
                          )}
                          {/* Grade B */}
                          {pctB > 0 && (
                            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f59e0b" strokeWidth="12"
                              strokeDasharray={`${(pctB / 100) * 251.2} 251.2`}
                              strokeDashoffset={-((pctA / 100) * 251.2)}
                              className="transition-all duration-1000 ease-out"
                            />
                          )}
                          {/* BS */}
                          {pctBS > 0 && (
                            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ef4444" strokeWidth="12"
                              strokeDasharray={`${(pctBS / 100) * 251.2} 251.2`}
                              strokeDashoffset={-(((pctA + pctB) / 100) * 251.2)}
                              className="transition-all duration-1000 ease-out"
                            />
                          )}
                        </svg>
                        {/* Center Content */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-3xl font-black text-slate-800 tracking-tight">{pctA.toFixed(0)}%</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Grade A</span>
                        </div>
                      </div>

                      {/* Breakdown List */}
                      <div className="mt-8 space-y-2">
                        <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-sky-50/50 transition-colors border border-transparent hover:border-sky-100/50">
                          <div className="flex items-center gap-3">
                            <div className="w-3.5 h-3.5 rounded-full bg-[#0070bc] shadow-[0_0_8px_rgba(0,112,188,0.4)]" />
                            <span className="text-xs font-extrabold text-slate-700">Grade A (Lolos)</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-black text-slate-800">{totalA.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-400 font-bold ml-1.5">{metricMode === "PCS" ? "Pcs" : "Baris"}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-amber-50/50 transition-colors border border-transparent hover:border-amber-100/50">
                          <div className="flex items-center gap-3">
                            <div className="w-3.5 h-3.5 rounded-full bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                            <span className="text-xs font-extrabold text-slate-700">Grade B (Lolos)</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-black text-slate-800">{totalB.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-400 font-bold ml-1.5">{metricMode === "PCS" ? "Pcs" : "Baris"}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-red-50/50 transition-colors border border-transparent hover:border-red-100/50">
                          <div className="flex items-center gap-3">
                            <div className="w-3.5 h-3.5 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.4)] animate-pulse" />
                            <span className="text-xs font-extrabold text-slate-700">BS (Recheck)</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-black text-slate-800">{totalBS.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-400 font-bold ml-1.5">{metricMode === "PCS" ? "Pcs" : "Baris"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 mt-6 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        Quality Overview
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>

          {/* Rekap Data Section */}
          <div className="bg-white border border-[#e9ecef] rounded-[32px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] mt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-50 rounded-xl text-[#0070bc]">
                  <TableIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Rekap Produksi Harian per Grup</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Ringkasan total hasil produksi ({metricMode === "PCS" ? "Pcs" : "Meter"}) berdasarkan grup</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors border border-emerald-200 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Export Excel
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors border border-rose-200 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export PDF
                </button>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar pb-2">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr>
                    <th className="py-3 px-4 bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-600 uppercase tracking-wider rounded-tl-xl">
                      Tanggal
                    </th>
                    {rekapData.groups.map(group => (
                      <th key={group} className="py-3 px-4 bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-600 uppercase tracking-wider text-right">
                        {group}
                      </th>
                    ))}
                    <th className="py-3 px-4 bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-[#0070bc] uppercase tracking-wider text-right rounded-tr-xl">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rekapData.data.length > 0 ? (
                    (isRekapExpanded ? rekapData.data : rekapData.data.slice(0, 5)).map((row) => (
                      <tr key={row.tanggal} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0">
                        <td className="py-3 px-4 text-sm font-bold text-slate-700">
                          {row.tanggal}
                        </td>
                        {rekapData.groups.map(g => (
                          <td key={g} className="py-3 px-4 text-sm font-semibold text-slate-600 text-right">
                            {row[g].toLocaleString()}
                          </td>
                        ))}
                        <td className="py-3 px-4 text-sm font-black text-[#0070bc] text-right bg-sky-50/30">
                          {row.total.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={rekapData.groups.length + 2} className="py-8 text-center text-sm font-semibold text-slate-400">
                        Tidak ada data untuk ditampilkan
                      </td>
                    </tr>
                  )}
                </tbody>
                {rekapData.data.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td className="py-3 px-4 text-sm font-black text-slate-800 rounded-bl-xl">
                        Total Keseluruhan
                      </td>
                      {rekapData.groups.map(g => (
                        <td key={g} className="py-3 px-4 text-sm font-black text-slate-800 text-right">
                          {rekapData.grandTotals[g].toLocaleString()}
                        </td>
                      ))}
                      <td className="py-3 px-4 text-sm font-black text-[#0070bc] text-right bg-sky-50/50 rounded-br-xl">
                        {rekapData.grandTotals.total.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {rekapData.data.length > 5 && (
              <div className="mt-4 flex justify-center pb-2">
                <button
                  onClick={() => setIsRekapExpanded(!isRekapExpanded)}
                  className="px-5 py-2.5 bg-sky-50/50 text-[#0070bc] hover:bg-sky-100/50 hover:shadow-sm rounded-xl text-sm font-bold transition-all border border-sky-100/50 cursor-pointer"
                >
                  {isRekapExpanded ? "Tampilkan Lebih Sedikit" : `Lihat Lengkap (${rekapData.data.length} baris)`}
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6 animate-fadeIn">
          {/* Attendance KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white border border-[#e9ecef] rounded-[24px] p-5 flex flex-col justify-between h-full min-h-[11rem] shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
              <div className="flex justify-between items-start">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Pegawai Pabrik</span>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-50 text-slate-600"><Users className="w-3.5 h-3.5" /></span>
              </div>
              <div className="mt-2">
                <div className="text-3xl font-black tracking-tight text-slate-800">{attendanceStats.totalPegawai} <span className="text-sm font-semibold opacity-80">Orang</span></div>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500 font-bold">Terdaftar dalam sistem</div>
              </div>
            </div>

            <div className="bg-[#0070bc] rounded-[24px] p-5 flex flex-col justify-between h-full min-h-[11rem] shadow-md text-white relative overflow-hidden group hover:scale-[1.01] transition-transform">
              <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-sky-400/20 blur-xl group-hover:scale-125 transition-all duration-300 pointer-events-none" />
              <div className="flex justify-between items-start relative z-10">
                <span className="text-sky-100 text-[10px] font-bold uppercase tracking-wider">Pegawai Hadir</span>
                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold"><Users className="w-3.5 h-3.5 text-white" /></span>
              </div>
              <div className="mt-2 relative z-10">
                <div className="text-3xl font-black tracking-tight flex items-baseline gap-1">{attendanceStats.countHadir} <span className="text-sm font-semibold opacity-80">Orang</span></div>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-sky-200 font-semibold">Tercatat memproduksi barang</div>
              </div>
            </div>

            <div className="bg-rose-50/40 border border-rose-100 rounded-[24px] p-5 flex flex-col justify-between h-full min-h-[11rem] shadow-[0_8px_30px_rgba(0,0,0,0.015)] relative">
              {attendanceStats.countTidakHadir > 0 && <div className="absolute inset-0 ring-2 ring-rose-500 rounded-[24px] pointer-events-none" />}
              <div className="flex justify-between items-start">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tidak Hadir / 0 Hasil</span>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${attendanceStats.countTidakHadir > 0 ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-slate-50 text-slate-500"}`}><AlertTriangle className="w-3.5 h-3.5" /></span>
              </div>
              <div className="mt-2">
                <div className="text-3xl font-black tracking-tight text-slate-800">{attendanceStats.countTidakHadir} <span className="text-sm font-semibold opacity-80 text-slate-500">Orang</span></div>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-rose-600 font-bold">Pegawai tidak ada rekaman hari ini</div>
              </div>
            </div>

            <div className="bg-white border border-[#e9ecef] rounded-[24px] p-5 flex flex-col justify-between h-full min-h-[11rem] shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
              <div className="flex justify-between items-start">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tingkat Kehadiran</span>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-emerald-50 text-emerald-600"><TrendingUp className="w-3.5 h-3.5" /></span>
              </div>
              <div className="mt-2">
                <div className="text-3xl font-black tracking-tight text-slate-800">{attendanceStats.persentaseHadir.toFixed(1)}%</div>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-600 font-bold">Persentase dari total pegawai</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List Absen */}
            <div className="bg-white border border-[#e9ecef] rounded-[32px] p-6 flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.02)] h-[400px]">
              <div className="border-b border-slate-100 pb-4 mb-4">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  Daftar Tidak Hadir
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-1">Pegawai yang belum memiliki rekaman produksi di rentang waktu ini.</p>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                {attendanceStats.listTidakHadir.length > 0 ? (
                  attendanceStats.listTidakHadir.map(op => (
                    <div key={op} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100/50 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                          {op.substring(0, 2)}
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{op}</span>
                      </div>
                      <span className="text-[10px] font-extrabold text-rose-500 bg-rose-50 px-2 py-1 rounded-md">ABSENT</span>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Users className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-xs font-semibold">Semua pegawai hadir!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Attendance Chart Mockup/Placeholder */}
            <div className="lg:col-span-2 bg-white border border-[#e9ecef] rounded-[32px] p-6 flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.02)] h-[400px]">
              <div className="border-b border-slate-100 pb-4 mb-4">
                <h3 className="text-base font-extrabold text-slate-800">Visualisasi Kehadiran</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-1">Gunakan grafik ini untuk memantau tren kehadiran operator.</p>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <BarChart2 className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-500">Grafik Tren Kehadiran</p>
                <p className="text-xs text-slate-400 mt-1 text-center max-w-sm">Data kehadiran saat ini diturunkan langsung dari produksi (Hadir/Tidak). Grafik analitik historis penuh akan diaktifkan setelah sistem input absensi siap.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
