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
  grade: "GRADE A" | "GRADE B" | "BS";
  design: string;
}

const dummyData: Transaction[] = [
  { id: 1, tanggal: "2026-05-18", hari: "SEN", nama_operator: "Budi Santoso", mesin_id: "KNIT-001", hasil_pcs: 240, target_pcs: 250, status_qc: "Lolos", rpm_mesin: 850, grade: "GRADE A", design: "Design A" },
  { id: 2, tanggal: "2026-05-18", hari: "SEN", nama_operator: "Rina Wijaya", mesin_id: "KNIT-003", hasil_pcs: 220, target_pcs: 230, status_qc: "Lolos", rpm_mesin: 840, grade: "GRADE B", design: "Design B" },
  { id: 3, tanggal: "2026-05-19", hari: "SEL", nama_operator: "Siti Rahma", mesin_id: "KNIT-002", hasil_pcs: 180, target_pcs: 200, status_qc: "Recheck", rpm_mesin: 720, grade: "BS", design: "Design A" },
  { id: 4, tanggal: "2026-05-19", hari: "SEL", nama_operator: "Ahmad Fauzi", mesin_id: "KNIT-004", hasil_pcs: 230, target_pcs: 230, status_qc: "Lolos", rpm_mesin: 860, grade: "GRADE A", design: "Design C" },
  { id: 5, tanggal: "2026-05-20", hari: "RAB", nama_operator: "Doni Setiawan", mesin_id: "KNIT-001", hasil_pcs: 250, target_pcs: 250, status_qc: "Lolos", rpm_mesin: 850, grade: "GRADE A", design: "Design A" },
  { id: 6, tanggal: "2026-05-20", hari: "RAB", nama_operator: "Eko Prasetyo", mesin_id: "KNIT-003", hasil_pcs: 190, target_pcs: 210, status_qc: "Recheck", rpm_mesin: 780, grade: "BS", design: "Design B" },
  { id: 7, tanggal: "2026-05-21", hari: "KAM", nama_operator: "Budi Santoso", mesin_id: "KNIT-001", hasil_pcs: 245, target_pcs: 245, status_qc: "Lolos", rpm_mesin: 855, grade: "GRADE A", design: "Design A" },
  { id: 8, tanggal: "2026-05-21", hari: "KAM", nama_operator: "Dewi Lestari", mesin_id: "KNIT-002", hasil_pcs: 235, target_pcs: 240, status_qc: "Lolos", rpm_mesin: 845, grade: "GRADE B", design: "Design C" },
  { id: 9, tanggal: "2026-05-22", hari: "JUM", nama_operator: "Rina Wijaya", mesin_id: "KNIT-003", hasil_pcs: 260, target_pcs: 260, status_qc: "Lolos", rpm_mesin: 860, grade: "GRADE A", design: "Design B" },
  { id: 10, tanggal: "2026-05-22", hari: "JUM", nama_operator: "Siti Rahma", mesin_id: "KNIT-002", hasil_pcs: 170, target_pcs: 200, status_qc: "Recheck", rpm_mesin: 690, grade: "BS", design: "Design A" },
  { id: 11, tanggal: "2026-05-23", hari: "SAB", nama_operator: "Ahmad Fauzi", mesin_id: "KNIT-004", hasil_pcs: 150, target_pcs: 160, status_qc: "Lolos", rpm_mesin: 820, grade: "GRADE B", design: "Design C" },
  { id: 12, tanggal: "2026-05-23", hari: "SAB", nama_operator: "Doni Setiawan", mesin_id: "KNIT-001", hasil_pcs: 140, target_pcs: 140, status_qc: "Lolos", rpm_mesin: 830, grade: "GRADE A", design: "Design A" },
  { id: 13, tanggal: "2026-05-24", hari: "MIN", nama_operator: "Eko Prasetyo", mesin_id: "KNIT-003", hasil_pcs: 120, target_pcs: 130, status_qc: "Lolos", rpm_mesin: 810, grade: "GRADE A", design: "Design B" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<"ALL" | "LOLOS" | "EFISIENSI" | "PROBLEMS">("ALL");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLive, setIsLive] = useState(false);

  // Date Filtering State
  const [dateRangeMode, setDateRangeMode] = useState<"ALL" | "TODAY" | "7DAYS" | "CUSTOM">("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Grade breakdown filter for Chart
  const [chartGradeFilter, setChartGradeFilter] = useState<"ALL" | "GRADE_A" | "GRADE_B" | "BS">("ALL");

  // Chart Dimension State
  const [chartGroupBy, setChartGroupBy] = useState<"HARI" | "DESIGN" | "PEGAWAI">("HARI");

  // Operator Filter State
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [isOperatorDropdownOpen, setIsOperatorDropdownOpen] = useState(false);

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

    const totalProduksi = gradeScoped.reduce((acc, curr) => acc + curr.hasil_pcs, 0);
    const totalTarget = gradeScoped.reduce((acc, curr) => acc + curr.target_pcs, 0);
    const countLolos = gradeScoped.filter(item => item.status_qc === "Lolos").length;
    const totalAll = dateFilteredTransactions.length;
    const persentaseLolos = totalAll > 0 ? (countLolos / totalAll) * 100 : 0;
    const efisiensi = totalTarget > 0 ? (totalProduksi / totalTarget) * 100 : 0;
    const countMasalah = gradeScoped.filter(item => item.status_qc === "Recheck").length;

    return {
      totalProduksi,
      persentaseLolos,
      efisiensi,
      countMasalah,
      totalItems: gradeScoped.length
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
        return dateFilteredTransactions.filter(item => item.status_qc === "Recheck");
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
      groups = designs.sort().slice(0, 7); // Limit to 7 max for UI consistency
    } else if (chartGroupBy === "PEGAWAI") {
      // Get top 7 operators by volume
      const operatorVolume: Record<string, number> = {};
      filteredData.forEach(item => {
        operatorVolume[item.nama_operator] = (operatorVolume[item.nama_operator] || 0) + item.hasil_pcs;
      });
      groups = Object.keys(operatorVolume)
        .sort((a, b) => operatorVolume[b] - operatorVolume[a])
        .slice(0, 7);
    }

    return groups.map(groupName => {
      let items: Transaction[] = [];
      if (chartGroupBy === "HARI") {
        items = filteredData.filter(item => item.hari === groupName);
      } else if (chartGroupBy === "DESIGN") {
        items = filteredData.filter(item => (item.design || "Tanpa Design") === groupName);
      } else if (chartGroupBy === "PEGAWAI") {
        items = filteredData.filter(item => item.nama_operator === groupName);
      }

      const gradeA_sum = items
        .filter(item => item.grade === "GRADE A")
        .reduce((acc, curr) => acc + curr.hasil_pcs, 0);

      const gradeB_sum = items
        .filter(item => item.grade === "GRADE B")
        .reduce((acc, curr) => acc + curr.hasil_pcs, 0);

      const bs_sum = items
        .filter(item => item.grade === "BS")
        .reduce((acc, curr) => acc + curr.hasil_pcs, 0);

      const total = gradeA_sum + gradeB_sum + bs_sum;

      return {
        label: groupName,
        gradeA_sum,
        gradeB_sum,
        bs_sum,
        total
      };
    });
  }, [filteredData, chartGroupBy]);

  const maxChartValue = useMemo(() => {
    let groups: string[] = [];
    if (chartGroupBy === "HARI") {
      groups = ["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"];
    } else if (chartGroupBy === "DESIGN") {
      groups = Array.from(new Set(dateFilteredTransactions.map(item => item.design || "Tanpa Design")));
    } else if (chartGroupBy === "PEGAWAI") {
      groups = Array.from(new Set(dateFilteredTransactions.map(item => item.nama_operator)));
    }

    const absoluteGroupTotals = groups.map(groupName => {
      let items: Transaction[] = [];
      if (chartGroupBy === "HARI") {
        items = dateFilteredTransactions.filter(item => item.hari === groupName);
      } else if (chartGroupBy === "DESIGN") {
        items = dateFilteredTransactions.filter(item => (item.design || "Tanpa Design") === groupName);
      } else if (chartGroupBy === "PEGAWAI") {
        items = dateFilteredTransactions.filter(item => item.nama_operator === groupName);
      }
      return items.reduce((acc, curr) => acc + curr.hasil_pcs, 0);
    });

    const max = Math.max(...absoluteGroupTotals, 10); // fallback min scale 10 agar batang kecil tetap terlihat
    return max;
  }, [dateFilteredTransactions, chartGroupBy]);

  const handleResetFilters = () => {
    setActiveFilter("ALL");
    setChartGradeFilter("ALL");
    setDateRangeMode("ALL");
    setStartDate("");
    setEndDate("");
    setSelectedOperators([]);
    setIsOperatorDropdownOpen(false);
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

      {/* Grid KPI Cards / Slicer Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Card 1: Hasil Produksi Hari Ini (Green Slicer) */}
        <div
          onClick={() => setActiveFilter("ALL")}
          className={`cursor-pointer transition-all duration-300 rounded-[24px] p-5 relative overflow-hidden flex flex-col justify-between h-40 group ${activeFilter === "ALL"
            ? "bg-[#004777] text-white shadow-xl scale-[1.03] ring-2 ring-[#0070bc] ring-offset-2"
            : "bg-[#0070bc] text-white/90 hover:scale-[1.01] hover:text-white"
            }`}
        >
          <div className="flex justify-between items-start z-10">
            <span className="text-sky-100 text-[10px] font-bold uppercase tracking-wider">
              Total Produksi ({gradeLabel})
            </span>
            <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white text-[10px] font-bold">
              All
            </span>
          </div>
          <div className="mt-2 z-10">
            <div className="text-3xl font-black tracking-tight">{stats.totalProduksi.toLocaleString()} Pcs</div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-sky-200 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+12% dari target shift</span>
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-sky-500/10 blur-xl group-hover:scale-125 transition-all duration-300" />
        </div>

        {/* Card 2: Lolos Inspeksi QC (White Slicer) */}
        <div
          onClick={() => setActiveFilter("LOLOS")}
          className={`cursor-pointer transition-all duration-300 rounded-[24px] p-5 flex flex-col justify-between h-40 border group ${activeFilter === "LOLOS"
            ? "bg-sky-50/50 border-sky-500 text-slate-800 shadow-md scale-[1.03] ring-2 ring-sky-500"
            : "bg-white border-[#e9ecef] text-slate-800 hover:scale-[1.01] hover:shadow-xs"
            }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              Lolos QC ({gradeLabel})
            </span>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${activeFilter === "LOLOS" ? "bg-sky-100 text-[#0070bc]" : "bg-slate-100 text-slate-500"
              }`}>
              OK
            </span>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-black tracking-tight text-slate-800">{stats.persentaseLolos.toFixed(1)}%</div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-[#0070bc] font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{stats.totalItems} data terhitung</span>
            </div>
          </div>
        </div>

        {/* Card 3: Chart Mode Selector (Replaced Efisiensi Produksi) */}
        <div className="bg-white border border-[#e9ecef] rounded-[24px] p-5 flex flex-col justify-between h-40 group shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              Mode Tampilan Grafik
            </span>
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-blue-50 text-blue-600">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            <button
              onClick={() => setChartGroupBy("HARI")}
              className={`flex items-center gap-2 text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${chartGroupBy === "HARI"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/50"
                }`}
            >
              <BarChart2 className="w-4 h-4" />
              Grafik per Hari
            </button>
            <button
              onClick={() => setChartGroupBy("DESIGN")}
              className={`flex items-center gap-2 text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${chartGroupBy === "DESIGN"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/50"
                }`}
            >
              <Palette className="w-4 h-4" />
              Grafik per Design
            </button>
            <button
              onClick={() => setChartGroupBy("PEGAWAI")}
              className={`flex items-center gap-2 text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${chartGroupBy === "PEGAWAI"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/50"
                }`}
            >
              <Users className="w-4 h-4" />
              Grafik per Pegawai
            </button>
          </div>
        </div>

        {/* Card 4: Masalah Produksi (White Slicer) */}
        <div
          onClick={() => setActiveFilter("PROBLEMS")}
          className={`cursor-pointer transition-all duration-300 rounded-[24px] p-5 flex flex-col justify-between h-40 border group ${activeFilter === "PROBLEMS"
            ? "bg-red-50/40 border-red-500 text-slate-800 shadow-md scale-[1.03] ring-2 ring-red-500"
            : "bg-white border-[#e9ecef] text-slate-800 hover:scale-[1.01] hover:shadow-xs"
            }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              Masalah ({gradeLabel})
            </span>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${activeFilter === "PROBLEMS" ? "bg-red-100 text-red-600 animate-pulse" : "bg-slate-100 text-slate-500"
              }`}>
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2">
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

          {/* SVG Custom Dynamic Stacked / Segmented Bar Chart */}
          <div className="flex-1 min-h-[220px] relative flex flex-col justify-between">
            <svg viewBox="0 0 600 240" className="w-full h-full overflow-visible">
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
              <line x1="40" y1="20" x2="580" y2="20" stroke="#f1f3f5" strokeWidth="1" />
              <line x1="40" y1="65" x2="580" y2="65" stroke="#f1f3f5" strokeWidth="1" />
              <line x1="40" y1="110" x2="580" y2="110" stroke="#f1f3f5" strokeWidth="1" />
              <line x1="40" y1="155" x2="580" y2="155" stroke="#f1f3f5" strokeWidth="1" />
              <line x1="40" y1="195" x2="580" y2="195" stroke="#e9ecef" strokeWidth="1.5" />

              {/* Y-Axis text labels */}
              <text x="30" y="24" fill="#a1a1aa" fontSize="9" fontWeight="bold" textAnchor="end">{Math.round(maxChartValue)}</text>
              <text x="30" y="69" fill="#a1a1aa" fontSize="9" fontWeight="bold" textAnchor="end">{Math.round(maxChartValue * 0.75)}</text>
              <text x="30" y="114" fill="#a1a1aa" fontSize="9" fontWeight="bold" textAnchor="end">{Math.round(maxChartValue * 0.5)}</text>
              <text x="30" y="159" fill="#a1a1aa" fontSize="9" fontWeight="bold" textAnchor="end">{Math.round(maxChartValue * 0.25)}</text>

              {/* Bars (Dynamic Groups) */}
              {chartData.map((d, index) => {
                const totalBars = chartData.length;
                // Calculate spacing based on number of bars (max 7) to keep them centered
                const totalWidth = 540;
                const barWidth = 28;
                const spacing = totalWidth / Math.max(totalBars, 1);
                // Center align items horizontally
                const xPos = 40 + (spacing * index) + (spacing / 2) - (barWidth / 2);

                // Stacked / Segmented Rendering Logic
                if (chartGradeFilter === "ALL") {
                  const hA = maxChartValue > 0 ? (d.gradeA_sum / maxChartValue) * 165 : 0;
                  const hB = maxChartValue > 0 ? (d.gradeB_sum / maxChartValue) * 165 : 0;
                  const hBS = maxChartValue > 0 ? (d.bs_sum / maxChartValue) * 165 : 0;

                  const yA = 195 - hA;
                  const yB = yA - hB;
                  const yBS = yB - hBS;

                  const totalHeight = hA + hB + hBS;
                  const yStart = 195 - totalHeight;

                  return (
                    <g key={d.label} className="group/bar">
                      <defs>
                        <clipPath id={`clip-${index}`}>
                          <rect
                            x={xPos}
                            y={yStart}
                            width="28"
                            height={totalHeight > 0 ? totalHeight : 1}
                            rx="6"
                          />
                        </clipPath>
                      </defs>
                      <g clipPath={totalHeight > 0 ? `url(#clip-${index})` : undefined}>
                        {/* Grade A Section */}
                        {hA > 0 && (
                          <rect
                            x={xPos}
                            y={yA}
                            width="28"
                            height={hA}
                            fill="#0070bc"
                            className="transition-all duration-500 ease-out cursor-pointer hover:opacity-85"
                          />
                        )}
                        {/* Grade B Section */}
                        {hB > 0 && (
                          <rect
                            x={xPos}
                            y={yB}
                            width="28"
                            height={hB}
                            fill="#f59e0b"
                            className="transition-all duration-500 ease-out cursor-pointer hover:opacity-85"
                          />
                        )}
                        {/* BS Section */}
                        {hBS > 0 && (
                          <rect
                            x={xPos}
                            y={yBS}
                            width="28"
                            height={hBS}
                            fill="#ef4444"
                            className="transition-all duration-500 ease-out cursor-pointer hover:opacity-85"
                          />
                        )}
                      </g>

                      {/* Labels inside the bar segments if tall enough */}
                      {hA > 12 && (
                        <text
                          x={xPos + 14}
                          y={yA + hA / 2 + 3}
                          fill="#ffffff"
                          fontSize="8"
                          fontWeight="extrabold"
                          textAnchor="middle"
                          pointerEvents="none"
                        >
                          {d.gradeA_sum}
                        </text>
                      )}
                      {hB > 12 && (
                        <text
                          x={xPos + 14}
                          y={yB + hB / 2 + 3}
                          fill="#ffffff"
                          fontSize="8"
                          fontWeight="extrabold"
                          textAnchor="middle"
                          pointerEvents="none"
                        >
                          {d.gradeB_sum}
                        </text>
                      )}
                      {hBS > 12 && (
                        <text
                          x={xPos + 14}
                          y={yBS + hBS / 2 + 3}
                          fill="#ffffff"
                          fontSize="8"
                          fontWeight="extrabold"
                          textAnchor="middle"
                          pointerEvents="none"
                        >
                          {d.bs_sum}
                        </text>
                      )}

                      {/* Permanent Total Label on Top */}
                      {d.total > 0 && (
                        <text
                          x={xPos + 14}
                          y={yStart - 6}
                          fill="#475569"
                          fontSize="9"
                          fontWeight="extrabold"
                          textAnchor="middle"
                        >
                          {d.total}
                        </text>
                      )}

                      {/* Detailed Tooltip on Hover */}
                      <text
                        x={xPos + 14}
                        y={yStart - 18}
                        fill="#1e293b"
                        fontSize="8"
                        fontWeight="extrabold"
                        textAnchor="middle"
                        className="opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200"
                      >
                        {`A:${d.gradeA_sum} B:${d.gradeB_sum} BS:${d.bs_sum}`}
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

                  const barHeight = maxChartValue > 0 ? (value / maxChartValue) * 165 : 0;
                  const barY = 195 - barHeight;

                  return (
                    <g key={d.label} className="group/bar">
                      <rect
                        x={xPos}
                        y={barY}
                        width="28"
                        height={barHeight}
                        rx="6"
                        fill={barFill}
                        className="transition-all duration-500 ease-out cursor-pointer hover:opacity-85"
                      />

                      {/* Permanent Value Label on Top */}
                      {value > 0 && (
                        <text
                          x={xPos + 14}
                          y={barY - 6}
                          fill="#475569"
                          fontSize="9"
                          fontWeight="extrabold"
                          textAnchor="middle"
                        >
                          {value}
                        </text>
                      )}

                      {/* Tooltip on Hover */}
                      <text
                        x={xPos + 14}
                        y={barY - 18}
                        fill="#1e293b"
                        fontSize="8"
                        fontWeight="extrabold"
                        textAnchor="middle"
                        className="opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200"
                      >
                        {value} Pcs
                      </text>
                    </g>
                  );
                }
              })}
            </svg>

            {/* X-Axis Labels */}
            <div className="flex justify-between text-[9px] text-slate-400 font-extrabold px-8 pt-3 border-t border-slate-100 h-8">
              {chartData.map((d, index) => (
                <span key={index} className="flex-1 text-center truncate px-1" title={d.label}>
                  {d.label.length > 10 ? d.label.substring(0, 8) + '...' : d.label}
                </span>
              ))}
            </div>

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
          const totalA = filteredData.filter(i => i.grade === "GRADE A").reduce((acc, curr) => acc + curr.hasil_pcs, 0);
          const totalB = filteredData.filter(i => i.grade === "GRADE B").reduce((acc, curr) => acc + curr.hasil_pcs, 0);
          const totalBS = filteredData.filter(i => i.grade === "BS").reduce((acc, curr) => acc + curr.hasil_pcs, 0);
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
                      {totalQuality.toLocaleString()} Pcs
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
                        <span className="text-[10px] text-slate-400 font-bold ml-1.5">Pcs</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-amber-50/50 transition-colors border border-transparent hover:border-amber-100/50">
                      <div className="flex items-center gap-3">
                        <div className="w-3.5 h-3.5 rounded-full bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                        <span className="text-xs font-extrabold text-slate-700">Grade B (Lolos)</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-800">{totalB.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 font-bold ml-1.5">Pcs</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-red-50/50 transition-colors border border-transparent hover:border-red-100/50">
                      <div className="flex items-center gap-3">
                        <div className="w-3.5 h-3.5 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.4)] animate-pulse" />
                        <span className="text-xs font-extrabold text-slate-700">BS (Recheck)</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-800">{totalBS.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 font-bold ml-1.5">Pcs</span>
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
