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
} from "lucide-react";
import { getRealProductionsData } from "@/actions/dashboard-actions";

interface Transaction {
  id: string | number;
  tanggal: string;
  hari: string;
  nama_operator: string;
  mesin_id: string;
  hasil_pcs: number;
  target_pcs: number;
  status_qc: "Lolos" | "Recheck";
  rpm_mesin: number;
  grade: "GRADE A" | "GRADE B" | "BS" | "UNGRADED";
  design: string;
  group?: string;
  is_production?: boolean;
}

const dummyData: Transaction[] = [
  { id: 1, tanggal: "2026-05-18", hari: "SEN", nama_operator: "Budi Santoso", mesin_id: "KNIT-001", hasil_pcs: 240, target_pcs: 250, status_qc: "Lolos", rpm_mesin: 850, grade: "GRADE A", design: "Design A", group: "Grup A" },
  { id: 2, tanggal: "2026-05-18", hari: "SEN", nama_operator: "Rina Wijaya", mesin_id: "KNIT-003", hasil_pcs: 220, target_pcs: 230, status_qc: "Lolos", rpm_mesin: 840, grade: "GRADE B", design: "Design B", group: "Grup B" },
  { id: 3, tanggal: "2026-05-19", hari: "SEL", nama_operator: "Siti Rahma", mesin_id: "KNIT-002", hasil_pcs: 180, target_pcs: 200, status_qc: "Recheck", rpm_mesin: 720, grade: "BS", design: "Design A", group: "Grup A" },
  { id: 4, tanggal: "2026-05-19", hari: "SEL", nama_operator: "Ahmad Fauzi", mesin_id: "KNIT-004", hasil_pcs: 230, target_pcs: 230, status_qc: "Lolos", rpm_mesin: 860, grade: "GRADE A", design: "Design C", group: "Grup C" },
  { id: 5, tanggal: "2026-05-20", hari: "RAB", nama_operator: "Doni Setiawan", mesin_id: "KNIT-001", hasil_pcs: 250, target_pcs: 250, status_qc: "Lolos", rpm_mesin: 850, grade: "GRADE A", design: "Design A", group: "Grup A" },
  { id: 6, tanggal: "2026-05-20", hari: "RAB", nama_operator: "Eko Prasetyo", mesin_id: "KNIT-003", hasil_pcs: 190, target_pcs: 210, status_qc: "Recheck", rpm_mesin: 780, grade: "BS", design: "Design B", group: "Grup B" },
  { id: 7, tanggal: "2026-05-21", hari: "KAM", nama_operator: "Budi Santoso", mesin_id: "KNIT-001", hasil_pcs: 245, target_pcs: 245, status_qc: "Lolos", rpm_mesin: 855, grade: "GRADE A", design: "Design A", group: "Grup A" },
  { id: 8, tanggal: "2026-05-21", hari: "KAM", nama_operator: "Dewi Lestari", mesin_id: "KNIT-002", hasil_pcs: 235, target_pcs: 240, status_qc: "Lolos", rpm_mesin: 845, grade: "GRADE B", design: "Design C", group: "Grup C" },
  { id: 9, tanggal: "2026-05-22", hari: "JUM", nama_operator: "Rina Wijaya", mesin_id: "KNIT-003", hasil_pcs: 260, target_pcs: 260, status_qc: "Lolos", rpm_mesin: 860, grade: "GRADE A", design: "Design B", group: "Grup B" },
  { id: 10, tanggal: "2026-05-22", hari: "JUM", nama_operator: "Siti Rahma", mesin_id: "KNIT-002", hasil_pcs: 170, target_pcs: 200, status_qc: "Recheck", rpm_mesin: 690, grade: "BS", design: "Design A", group: "Grup A" },
  { id: 11, tanggal: "2026-05-23", hari: "SAB", nama_operator: "Ahmad Fauzi", mesin_id: "KNIT-004", hasil_pcs: 150, target_pcs: 160, status_qc: "Lolos", rpm_mesin: 820, grade: "GRADE B", design: "Design C", group: "Grup C" },
  { id: 12, tanggal: "2026-05-23", hari: "SAB", nama_operator: "Doni Setiawan", mesin_id: "KNIT-001", hasil_pcs: 140, target_pcs: 140, status_qc: "Lolos", rpm_mesin: 830, grade: "GRADE A", design: "Design A", group: "Grup A" },
  { id: 13, tanggal: "2026-05-24", hari: "MIN", nama_operator: "Eko Prasetyo", mesin_id: "KNIT-003", hasil_pcs: 120, target_pcs: 130, status_qc: "Lolos", rpm_mesin: 810, grade: "GRADE A", design: "Design B", group: "Grup B" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<"ALL" | "LOLOS" | "EFISIENSI" | "PROBLEMS" | "NOL_PRODUKSI">("ALL");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLive, setIsLive] = useState(false);

  // Metric Mode State (also controls Card 1 and Card 4 sliders)
  const [metricMode, setMetricMode] = useState<"PCS" | "BARIS">("PCS");

  // Date Filtering State
  const [dateRangeMode, setDateRangeMode] = useState<"ALL" | "TODAY" | "7DAYS" | "CUSTOM">("7DAYS");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Grade breakdown filter for Chart
  const [chartGradeFilter, setChartGradeFilter] = useState<"ALL" | "GRADE_A" | "GRADE_B" | "BS">("ALL");

  // Chart Dimension State
  const [chartGroupBy, setChartGroupBy] = useState<"HARI" | "DESIGN" | "PEGAWAI" | "GROUP">("HARI");

  // Chart Type State
  const [chartType, setChartType] = useState<"BAR" | "LINE">("BAR");

  // Operator Filter State
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [isOperatorDropdownOpen, setIsOperatorDropdownOpen] = useState(false);

  // Swipe State for mobile
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const handleTouchEndMetric = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 40) setMetricMode("BARIS");
    else if (diff < -40) setMetricMode("PCS");
    setTouchStartX(null);
  };
  const handleTouchEndProblems = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 40) { setActiveFilter("NOL_PRODUKSI"); setMetricMode("BARIS"); }
    else if (diff < -40) { setActiveFilter("PROBLEMS"); setMetricMode("PCS"); }
    setTouchStartX(null);
  };

  // Load real production data from Supabase
  useEffect(() => {
    async function loadLiveData() {
      try {
        const res = await getRealProductionsData();
        console.log("Dashboard Live Data Response:", res);
        if (res.success && res.data) {
          if (user?.role === 'employee' && user?.fullName) {
            const cleanName = user.fullName.replace(" (Demo)", "");
            const myData = res.data.filter(t => t.nama_operator.toLowerCase() === cleanName.toLowerCase());
            setTransactions(myData);
          } else {
            setTransactions(res.data);
          }
          setIsLive(true);
        } else if (!res.success) {
          console.error("Failed to load dashboard data:", res.error);
        }
      } catch (err) {
        console.error("Error calling getRealProductionsData:", err);
      }
    }
    if (user) {
      loadLiveData();
    }
  }, [user]);

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
    
    const totalProduksi = productionOnly.reduce((acc, curr) => acc + curr.hasil_pcs, 0);
    const totalTarget = productionOnly.reduce((acc, curr) => acc + curr.target_pcs, 0);
    const countLolos = productionOnly.filter(item => item.status_qc === "Lolos").length;
    const countLolosSemua = gradeScoped.filter(item => item.status_qc === "Lolos").length;
    const totalItems = productionOnly.length;
    
    const persentaseLolos = totalItems > 0 ? (countLolos / totalItems) * 100 : 0;
    const efisiensi = totalTarget > 0 ? (totalProduksi / totalTarget) * 100 : 0;
    
    // We count problems only for actual productions (is_production === true) and exclude UNGRADED
    const countMasalah = gradeScoped.filter(item => item.status_qc === "Recheck" && item.grade !== "UNGRADED" && item.is_production).length;
    const countNolProduksi = gradeScoped.filter(item => item.hasil_pcs === 0).length;
    const totalPanel = gradeScoped.length;
    const persentaseLolosSemua = totalPanel > 0 ? (countLolosSemua / totalPanel) * 100 : 0;

    return {
      totalProduksi,
      totalTarget,
      persentaseLolos,
      persentaseLolosSemua,
      efisiensi,
      countMasalah,
      totalItems,
      totalPanel,
      countNolProduksi
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
        return dateFilteredTransactions.filter(item => item.status_qc === "Recheck" && item.grade !== "UNGRADED" && item.is_production);
      case "NOL_PRODUKSI":
        return dateFilteredTransactions.filter(item => item.hasil_pcs === 0);
      case "ALL":
      default:
        return dateFilteredTransactions;
    }
  }, [activeFilter, dateFilteredTransactions]);

  // Aggregate daily production data for dynamic chart, segmented by grade
  const chartData = useMemo(() => {
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
        .reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : 1), 0);

      const gradeB_sum = items
        .filter(item => item.grade === "GRADE B")
        .reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : 1), 0);

      const bs_sum = items
        .filter(item => item.grade === "BS")
        .reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : 1), 0);

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
        const gA = items.filter(i => i.grade === "GRADE A").reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : 1), 0);
        const gB = items.filter(i => i.grade === "GRADE B").reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : 1), 0);
        const bs = items.filter(i => i.grade === "BS").reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : 1), 0);
        return Math.max(gA, gB, bs);
      } else if (chartGradeFilter === "GRADE_A") {
        return items.filter(i => i.grade === "GRADE A").reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : 1), 0);
      } else if (chartGradeFilter === "GRADE_B") {
        return items.filter(i => i.grade === "GRADE B").reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : 1), 0);
      } else if (chartGradeFilter === "BS") {
        return items.filter(i => i.grade === "BS").reduce((acc, curr) => acc + (metricMode === "PCS" ? curr.hasil_pcs : 1), 0);
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

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Header */}
      <div className="bg-white border border-[#e9ecef] rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 relative z-10">
        <div className="flex flex-col gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex flex-wrap items-center gap-3 leading-tight">
              <span className="bg-gradient-to-r from-slate-900 via-[#004777] to-[#0070bc] bg-clip-text text-transparent drop-shadow-sm">
                My Dashboard
              </span>
              {isLive && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-xs animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Live Data
                </span>
              )}
            </h1>
            <p className="text-slate-500 text-sm sm:text-base font-medium max-w-2xl leading-relaxed flex items-start gap-1.5 mt-1">
              <svg className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pantau pencapaian produksi harian dan kualitas kerja Anda secara real-time.
            </p>
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
        </div>

      {/* Grid KPI Cards / Slicer Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Card 1: Hasil Produksi & Total Baris (Slider Slicer) */}
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
                  <span className="text-sm font-semibold opacity-80">Pcs</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-sky-200 font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Berdasarkan pcs</span>
                </div>
              </div>
            </div>

            {/* Slide 1: Total Baris (Panel) */}
            <div 
              onClick={() => { setActiveFilter("ALL"); setMetricMode("BARIS"); }}
              className="w-1/2 cursor-pointer p-5 flex flex-col justify-between h-full relative text-white"
            >
              <div className="flex justify-between items-start relative z-10">
                <span className="text-sky-100 text-[10px] font-bold uppercase tracking-wider">
                  Total Panel ({gradeLabel})
                </span>
                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white text-[10px] font-bold">
                  All
                </span>
              </div>
              <div className="mt-2 relative z-10">
                <div className="text-3xl font-black tracking-tight flex items-baseline gap-1">
                  {stats.totalPanel.toLocaleString()}
                  <span className="text-sm font-semibold opacity-80">Baris</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-sky-200 font-semibold">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Berdasarkan baris data</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dots Indicator */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 z-20" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setMetricMode("PCS"); if(activeFilter === "NOL_PRODUKSI") setActiveFilter("PROBLEMS"); }}
              className="p-3 -m-3 cursor-pointer"
              title="Geser ke Total Produksi"
            >
              <div className={`h-1.5 rounded-full transition-all duration-300 ${metricMode === "PCS" ? "w-4 bg-white" : "w-1.5 bg-sky-300/50 hover:bg-sky-200"}`} />
            </button>
            <button
              onClick={() => { setMetricMode("BARIS"); if(activeFilter === "PROBLEMS") setActiveFilter("NOL_PRODUKSI"); }}
              className="p-3 -m-3 cursor-pointer ml-3"
              title="Geser ke Total Panel"
            >
              <div className={`h-1.5 rounded-full transition-all duration-300 ${metricMode === "BARIS" ? "w-4 bg-white" : "w-1.5 bg-sky-300/50 hover:bg-sky-200"}`} />
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
            {/* Slide 0: Lolos QC (Berdasarkan PCS/ProduksiOnly) */}
            <div 
              onClick={() => { setActiveFilter("LOLOS"); setMetricMode("PCS"); }}
              className="w-1/2 cursor-pointer p-5 flex flex-col justify-between h-full relative"
            >
              <div className="flex justify-between items-start relative z-10">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  Lolos QC ({gradeLabel})
                </span>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${activeFilter === "LOLOS" ? "bg-sky-100 text-[#0070bc]" : "bg-slate-100 text-slate-500"
                  }`}>
                  OK
                </span>
              </div>
              <div className="mt-2 relative z-10">
                <div className="text-3xl font-black tracking-tight text-slate-800">{stats.persentaseLolos.toFixed(1)}%</div>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-[#0070bc] font-bold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{stats.totalItems} data terhitung</span>
                </div>
              </div>
            </div>

            {/* Slide 1: Lolos QC (Berdasarkan Panel/Semua) */}
            <div 
              onClick={() => { setActiveFilter("LOLOS"); setMetricMode("BARIS"); }}
              className="w-1/2 cursor-pointer p-5 flex flex-col justify-between h-full relative"
            >
              <div className="flex justify-between items-start relative z-10">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  Lolos QC Panel ({gradeLabel})
                </span>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${activeFilter === "LOLOS" ? "bg-sky-100 text-[#0070bc]" : "bg-slate-100 text-slate-500"
                  }`}>
                  OK
                </span>
              </div>
              <div className="mt-2 relative z-10">
                <div className="text-3xl font-black tracking-tight text-slate-800">{stats.persentaseLolosSemua.toFixed(1)}%</div>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-[#0070bc] font-bold">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{stats.totalPanel} panel terhitung</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dots Indicator */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 z-20" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setMetricMode("PCS"); if(activeFilter === "LOLOS") setActiveFilter("LOLOS"); }}
              className="p-3 -m-3 cursor-pointer"
              title="Geser ke QC Produksi"
            >
              <div className={`h-1.5 rounded-full transition-all duration-300 ${metricMode === "PCS" ? (activeFilter === "LOLOS" ? "w-4 bg-sky-500" : "w-4 bg-slate-800") : "w-1.5 bg-slate-300 hover:bg-slate-400"}`} />
            </button>
            <button
              onClick={() => { setMetricMode("BARIS"); if(activeFilter === "LOLOS") setActiveFilter("LOLOS"); }}
              className="p-3 -m-3 cursor-pointer ml-3"
              title="Geser ke QC Panel"
            >
              <div className={`h-1.5 rounded-full transition-all duration-300 ${metricMode === "BARIS" ? (activeFilter === "LOLOS" ? "w-4 bg-sky-500" : "w-4 bg-slate-800") : "w-1.5 bg-slate-300 hover:bg-slate-400"}`} />
            </button>
          </div>
        </div>

        {/* Card 3: Status Produksi Summary */}
        <div className="bg-white border border-[#e9ecef] rounded-[24px] p-5 flex flex-col justify-between h-full min-h-[11rem] shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              Efisiensi Produksi Saya
            </span>
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-purple-50 text-purple-600">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-black tracking-tight text-slate-800">{stats.efisiensi.toFixed(1)}%</div>
            
            {/* Target Indicator */}
            {stats.totalTarget > 0 ? (
              stats.totalProduksi >= stats.totalTarget ? (
                <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Target Tercapai
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-1 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-700 font-extrabold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Kurang {stats.totalTarget - stats.totalProduksi} Pcs
                </div>
              )
            ) : (
              <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Belum Ada Target
              </div>
            )}
            
            <div className="flex items-center gap-1 mt-2 text-[11px] text-purple-600 font-bold">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Berdasarkan Target vs Hasil</span>
            </div>
          </div>
        </div>

        {/* Card 4: Masalah & Produksi Nol (Slider Slicer) */}
        <div 
          className="relative overflow-hidden rounded-[24px] h-full min-h-[11rem] group border border-[#e9ecef] bg-white hover:shadow-xs transition-all duration-300 flex flex-col"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEndProblems}
        >
          
          {/* Slide Container */}
          <div 
            className="flex h-full w-[200%] transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${metricMode === "PCS" ? 0 : 50}%)` }}
          >
            {/* Slide 0: Masalah */}
            <div 
              onClick={() => { setActiveFilter("PROBLEMS"); setMetricMode("PCS"); }}
              className={`w-1/2 cursor-pointer p-5 flex flex-col justify-between h-full relative ${activeFilter === "PROBLEMS"
                ? "bg-red-50/40 text-slate-800"
                : "bg-white text-slate-800"
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

            {/* Slide 1: Produksi Nol */}
            <div 
              onClick={() => { setActiveFilter("NOL_PRODUKSI"); setMetricMode("BARIS"); }}
              className={`w-1/2 cursor-pointer p-5 flex flex-col justify-between h-full relative ${activeFilter === "NOL_PRODUKSI"
                ? "bg-orange-50/40 text-slate-800"
                : "bg-white text-slate-800"
              }`}
            >
              {activeFilter === "NOL_PRODUKSI" && (
                <div className="absolute inset-0 ring-2 ring-orange-500 rounded-[24px] pointer-events-none" />
              )}
              <div className="flex justify-between items-start relative z-10">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  Produksi Nol ({gradeLabel})
                </span>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${activeFilter === "NOL_PRODUKSI" ? "bg-orange-100 text-orange-600 animate-pulse" : "bg-slate-100 text-slate-500"
                  }`}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-2 relative z-10">
                <div className="text-3xl font-black tracking-tight text-slate-800">{stats.countNolProduksi} Baris</div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-orange-600 font-extrabold">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  <span>Hasil 0 Pcs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dots Indicator */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 z-20" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setMetricMode("PCS"); if(activeFilter === "NOL_PRODUKSI") setActiveFilter("PROBLEMS"); }}
              className="p-3 -m-3 cursor-pointer"
              title="Geser ke Masalah"
            >
              <div className={`h-1.5 rounded-full transition-all duration-300 ${metricMode === "PCS" ? (activeFilter === "PROBLEMS" ? "w-4 bg-red-500" : "w-4 bg-slate-800") : "w-1.5 bg-slate-300 hover:bg-slate-400"}`} />
            </button>
            <button
              onClick={() => { setMetricMode("BARIS"); if(activeFilter === "PROBLEMS") setActiveFilter("NOL_PRODUKSI"); }}
              className="p-3 -m-3 cursor-pointer ml-3"
              title="Geser ke Produksi Nol"
            >
              <div className={`h-1.5 rounded-full transition-all duration-300 ${metricMode === "BARIS" ? (activeFilter === "NOL_PRODUKSI" ? "w-4 bg-orange-500" : "w-4 bg-slate-800") : "w-1.5 bg-slate-300 hover:bg-slate-400"}`} />
            </button>
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

                        // Grouped Rendering Logic
                        if (chartGradeFilter === "ALL") {
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
                            <g key={d.label} className="group/bar">
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
                                  <text x={xA + barW / 2} y={yA - 4} fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle" className="opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200">
                                    {d.gradeA_sum}
                                  </text>
                                  <text x={xB + barW / 2} y={yB - 4} fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle" className="opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200">
                                    {d.gradeB_sum}
                                  </text>
                                  <text x={xBS + barW / 2} y={yBS - 4} fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle" className="opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200">
                                    {d.bs_sum}
                                  </text>

                                  {/* Total summary below tooltip */}
                                  <text x={groupCenter} y={12} fill="#1e293b" fontSize="9" fontWeight="extrabold" textAnchor="middle" className="opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200">
                                    {d.total > 0 ? `Total: ${d.total}` : ""}
                                  </text>
                                </>
                              )}

                              {/* Unified Tooltip for LINE chart */}
                              {chartType === "LINE" && (
                                <g className="opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 pointer-events-none">
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
                            <g key={d.label} className="group/bar">
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
                                <g className="opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 pointer-events-none">
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
    </div>
  );
}
