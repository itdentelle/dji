"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getMachineStatuses, MachineStatus } from "@/actions/dashboard-actions";
import { getMachineConfigs, upsertAllMachineConfigs, MachineConfig } from "@/actions/machine-config-actions";
import {
  Activity,
  Power,
  Clock,
  RefreshCw,
  HelpCircle,
  Settings2,
  Save,
  X,
  User,
  ChevronRight,
  BarChart3,
  Search,
  Filter,
  CheckCircle2,
  Cpu,
  Layers,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import ProductTour, { ProductTourStep } from "@/components/ProductTour";

const MACHINE_TOUR_STEPS: ProductTourStep[] = [
  {
    target: "machine-header",
    title: "Monitoring Mesin",
    description:
      "Pantau status mesin produksi secara real-time dan gunakan refresh jika ingin mengambil data terbaru secara manual.",
  },
  {
    target: "machine-summary",
    title: "Ringkasan Status",
    description:
      "Klik kartu ringkasan ini untuk langsung mengfilter daftar mesin berdasarkan status operasionalnya.",
  },
  {
    target: "machine-grid",
    title: "Kartu Mesin",
    description:
      "Setiap kartu menampilkan nomor mesin, operator, desain aktif, potongan ke, dan status operasional real-time.",
  },
];

type FilterStatus = "Semua" | "Beroperasi" | "Idle" | "Tidak Aktif";

export default function MachinesPage() {
  const router = useRouter();
  const [machines, setMachines] = useState<MachineStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("Semua");

  // Config Modal State
  const [configs, setConfigs] = useState<MachineConfig[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      const res = await getMachineStatuses();
      if (res.success && res.data) {
        setMachines(res.data);
        setError(null);
        setLastRefresh(new Date());
      } else {
        setError(res.error || "Gagal memuat status mesin.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigs = async () => {
    let localDataPcs: Record<string, number> = {};
    let localDataTypes: Record<string, "PANEL" | "METER"> = {};
    try {
      const savedPcs = localStorage.getItem("dji_machine_configs");
      if (savedPcs) localDataPcs = JSON.parse(savedPcs);
      const savedTypes = localStorage.getItem("dji_machine_input_types");
      if (savedTypes) localDataTypes = JSON.parse(savedTypes);
    } catch (e) {}

    const res = await getMachineConfigs();
    if (res.success && res.data) {
      const merged = res.data.map((c) => ({
        ...c,
        default_pcs: localDataPcs[c.nomor_mc] !== undefined ? localDataPcs[c.nomor_mc] : c.default_pcs,
        input_type: localDataTypes[c.nomor_mc] || c.input_type || "PANEL",
      }));
      setConfigs(merged);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    fetchStatuses();

    // Auto refresh every 60 seconds
    const interval = setInterval(() => {
      fetchStatuses();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Counts
  const totalOperating = useMemo(
    () => machines.filter((m) => m.status === "Beroperasi").length,
    [machines]
  );
  const totalIdle = useMemo(
    () => machines.filter((m) => m.status === "Idle").length,
    [machines]
  );
  const totalTidakAktif = useMemo(
    () => machines.filter((m) => m.status === "Tidak Aktif").length,
    [machines]
  );

  const operatingPercentage = useMemo(() => {
    if (machines.length === 0) return 0;
    return Math.round((totalOperating / machines.length) * 100);
  }, [machines.length, totalOperating]);

  // Filtered Machines
  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      const matchesStatus =
        statusFilter === "Semua" || m.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.mesin_id.toLowerCase().includes(q) ||
        m.nama_operator.toLowerCase().includes(q) ||
        m.design.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [machines, statusFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      {/* Top Bar Header */}
      <div
        data-tour="machine-header"
        className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 lg:mb-8 gap-4"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
              Monitoring Mesin
            </h1>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Status operasional & aktivitas mesin rajut secara real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Settings2 className="w-4 h-4 text-[#0070bc] shrink-0" />
            <span>Default Mesin</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTourOpen(true)}
            className="h-10 px-3.5 rounded-xl border border-sky-100 bg-sky-50/80 hover:bg-sky-100 text-[#0070bc] text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Tutorial</span>
          </button>

          <div className="h-10 inline-flex items-center gap-3 bg-white px-3.5 rounded-xl border border-slate-200 shadow-xs text-xs ml-auto md:ml-0">
            <span className="text-slate-500 font-medium hidden sm:inline">
              Update:
            </span>
            <strong className="text-slate-800 font-bold tabular-nums">
              {lastRefresh
                ? lastRefresh.toLocaleTimeString("id-ID")
                : "Memuat..."}
            </strong>
            <button
              onClick={fetchStatuses}
              disabled={loading}
              className={`p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-all cursor-pointer active:scale-90 ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              title="Refresh Data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div
        data-tour="machine-summary"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
      >
        {/* Total Mesin Card */}
        <div
          onClick={() => setStatusFilter("Semua")}
          className={`p-4 lg:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
            statusFilter === "Semua"
              ? "bg-gradient-to-br from-blue-600 to-[#0070bc] border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.01]"
              : "bg-white border-slate-200 text-slate-800 hover:border-blue-300 hover:shadow-md"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`p-3 rounded-xl ${
                statusFilter === "Semua"
                  ? "bg-white/20 text-white"
                  : "bg-blue-50 text-blue-600"
              }`}
            >
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div
                className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                  statusFilter === "Semua" ? "text-blue-100" : "text-slate-400"
                }`}
              >
                Total Mesin Aktif
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
                {machines.length}
              </div>
            </div>
          </div>
          <div
            className={`text-right text-xs font-bold ${
              statusFilter === "Semua" ? "text-blue-100" : "text-slate-400"
            }`}
          >
            <div className="text-lg font-black">{operatingPercentage}%</div>
            <div className="text-[10px] uppercase font-bold tracking-wider">Efisiensi</div>
          </div>
        </div>

        {/* Beroperasi Card */}
        <div
          onClick={() => setStatusFilter("Beroperasi")}
          className={`p-4 lg:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
            statusFilter === "Beroperasi"
              ? "bg-gradient-to-br from-emerald-600 to-emerald-700 border-emerald-600 text-white shadow-lg shadow-emerald-500/20 scale-[1.01]"
              : "bg-white border-slate-200 text-slate-800 hover:border-emerald-300 hover:shadow-md"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`p-3 rounded-xl relative ${
                statusFilter === "Beroperasi"
                  ? "bg-white/20 text-white"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <Power className="w-6 h-6" />
            </div>
            <div>
              <div
                className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                  statusFilter === "Beroperasi"
                    ? "text-emerald-100"
                    : "text-slate-400"
                }`}
              >
                Beroperasi
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
                {totalOperating}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                statusFilter === "Beroperasi" ? "bg-white" : "bg-emerald-500"
              } animate-pulse`}
            />
            <span
              className={`text-xs font-bold ${
                statusFilter === "Beroperasi"
                  ? "text-emerald-100"
                  : "text-emerald-600"
              }`}
            >
              Aktif
            </span>
          </div>
        </div>

        {/* Idle Card */}
        <div
          onClick={() => setStatusFilter("Idle")}
          className={`p-4 lg:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
            statusFilter === "Idle"
              ? "bg-gradient-to-br from-amber-500 to-amber-600 border-amber-500 text-white shadow-lg shadow-amber-500/20 scale-[1.01]"
              : "bg-white border-slate-200 text-slate-800 hover:border-amber-300 hover:shadow-md"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`p-3 rounded-xl ${
                statusFilter === "Idle"
                  ? "bg-white/20 text-white"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div
                className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                  statusFilter === "Idle" ? "text-amber-100" : "text-slate-400"
                }`}
              >
                Idle / Standby
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
                {totalIdle}
              </div>
            </div>
          </div>
          <div
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              statusFilter === "Idle"
                ? "bg-white/20 text-white"
                : "bg-amber-50 text-amber-600 border border-amber-200"
            }`}
          >
            {totalTidakAktif > 0 ? `${totalTidakAktif} Off` : "Normal"}
          </div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Filter Status Tabs */}
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          {(["Semua", "Beroperasi", "Idle", "Tidak Aktif"] as FilterStatus[]).map(
            (status) => {
              const isActive = statusFilter === status;
              const count =
                status === "Semua"
                  ? machines.length
                  : status === "Beroperasi"
                  ? totalOperating
                  : status === "Idle"
                  ? totalIdle
                  : totalTidakAktif;

              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-slate-800 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span>{status}</span>
                  <span
                    className={`px-1.5 py-0.2 text-[10px] rounded-md font-extrabold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            }
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari mesin, operator, design..."
            className="w-full h-10 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#0070bc] focus:ring-1 focus:ring-[#0070bc] outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl mb-6 text-xs font-bold flex items-center gap-2">
          <X className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton Grid */}
      {loading && machines.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs animate-pulse space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="w-24 h-4 bg-slate-200 rounded-md" />
                <div className="w-16 h-4 bg-slate-200 rounded-full" />
              </div>
              <div className="h-10 bg-slate-200 rounded-xl w-1/2 mx-auto my-4" />
              <div className="space-y-2">
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredMachines.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs flex flex-col items-center justify-center my-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
            <Cpu className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Tidak ada mesin ditemukan
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Tidak ditemukan mesin yang cocok dengan kata kunci{" "}
            <strong>"{searchQuery}"</strong> atau filter status{" "}
            <strong>"{statusFilter}"</strong>.
          </p>
          {(searchQuery || statusFilter !== "Semua") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("Semua");
              }}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Reset Filter & Pencarian
            </button>
          )}
        </div>
      ) : (
        /* Machine Grid */
        <div
          data-tour="machine-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          {filteredMachines.map((machine) => {
            const isOperating = machine.status === "Beroperasi";
            const isIdle = machine.status === "Idle";
            const isInactive = machine.status === "Tidak Aktif";

            return (
              <div
                key={machine.mesin_id}
                onClick={() => router.push(`/machines/${machine.mesin_id}`)}
                className={`group bg-white rounded-2xl shadow-xs border transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 ${
                  isInactive
                    ? "border-slate-200 bg-slate-50/40"
                    : isIdle
                    ? "border-amber-200 hover:border-amber-400"
                    : "border-emerald-200 hover:border-emerald-400"
                }`}
              >
                {/* Header Status Bar */}
                <div
                  className={`px-4 py-3 border-b flex justify-between items-center ${
                    isOperating
                      ? "bg-emerald-50/80 border-emerald-100"
                      : isIdle
                      ? "bg-amber-50/80 border-amber-100"
                      : "bg-slate-100/80 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      {isOperating && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      )}
                      <span
                        className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                          isOperating
                            ? "bg-emerald-500"
                            : isIdle
                            ? "bg-amber-500"
                            : "bg-slate-400"
                        }`}
                      />
                    </span>
                    <span
                      className={`text-xs font-black uppercase tracking-wider ${
                        isOperating
                          ? "text-emerald-800"
                          : isIdle
                          ? "text-amber-800"
                          : "text-slate-600"
                      }`}
                    >
                      {machine.status}
                    </span>
                  </div>

                  {machine.last_input_time !== "-" && (
                    <div
                      className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-xs ${
                        isOperating
                          ? "bg-white text-emerald-700 border border-emerald-200"
                          : isIdle
                          ? "bg-white text-amber-700 border border-amber-200"
                          : "bg-slate-200/80 text-slate-600"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{machine.last_input_time}</span>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="text-center my-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                      Nomor Mesin
                    </span>
                    <div
                      className={`inline-flex items-center justify-center px-4 py-1 rounded-xl text-3xl font-black tracking-tight border font-mono shadow-2xs ${
                        isOperating
                          ? "bg-emerald-50/90 border-emerald-200/80 text-emerald-900"
                          : isIdle
                          ? "bg-amber-50/90 border-amber-200/80 text-amber-900"
                          : "bg-slate-100 border-slate-200 text-slate-600"
                      }`}
                    >
                      {machine.mesin_id}
                    </div>
                  </div>

                  <div className="space-y-2.5 mt-4">
                    {/* Operator */}
                    <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-medium flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Operator
                      </span>
                      <span
                        className={`font-black uppercase text-xs truncate max-w-[140px] text-right ${
                          isInactive ? "text-slate-400" : "text-slate-800"
                        }`}
                      >
                        {machine.nama_operator}
                      </span>
                    </div>

                    {/* Desain Aktif */}
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">
                        Desain Aktif
                      </span>
                      <span
                        className={`font-bold text-[11px] px-2.5 py-0.5 rounded-md truncate max-w-[140px] ${
                          isOperating
                            ? "bg-blue-50 text-[#0070bc] border border-blue-100"
                            : isIdle
                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {machine.design}
                      </span>
                    </div>

                    {/* Potongan Ke */}
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">
                        Potongan Ke
                      </span>
                      <span
                        className={`font-black text-[11px] px-2 py-0.5 rounded-md ${
                          machine.potongan_ke && machine.potongan_ke !== "-"
                            ? "bg-slate-100 text-slate-800 border border-slate-200 font-mono"
                            : "text-slate-400"
                        }`}
                      >
                        {machine.potongan_ke && machine.potongan_ke !== "-"
                          ? `#${machine.potongan_ke}`
                          : "-"}
                      </span>
                    </div>

                    {/* Tanggal Update */}
                    <div className="flex justify-between items-center text-xs pb-1">
                      <span className="text-slate-400">Tgl Update</span>
                      <span className="text-slate-500 font-medium">
                        {machine.last_input_date !== "-"
                          ? machine.last_input_date
                          : "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0070bc] group-hover:bg-blue-50/50 transition-colors">
                  <span className="flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-[#0070bc]" />
                    Analisis Blok
                  </span>
                  <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Pengaturan Default Mesin */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-[#0070bc]">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800">
                    Pengaturan Default Parameter Mesin
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Tentukan target PCS & mode input default untuk setiap mesin rajut.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
              <div className="text-xs text-slate-600 bg-blue-50/80 p-3.5 rounded-2xl border border-blue-100 flex items-start gap-2.5">
                <SlidersHorizontal className="w-4 h-4 text-[#0070bc] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Catatan:</strong> Parameter ini otomatis digunakan sebagai default saat Admin membuat Jadwal Produksi baru atau saat Operator menginput laporan panel/meter.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {configs.map((cfg, idx) => (
                  <div
                    key={cfg.nomor_mc}
                    className="flex flex-col gap-2.5 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="bg-slate-900 text-white font-black px-3 py-1 rounded-xl text-xs tracking-wider font-mono">
                        {cfg.nomor_mc}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                      {/* Default PCS */}
                      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">
                        <span className="text-[11px] font-bold text-slate-500">
                          PCS:
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={cfg.default_pcs}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            const newConfigs = [...configs];
                            newConfigs[idx].default_pcs = val;
                            setConfigs(newConfigs);
                          }}
                          className="w-12 h-7 text-center rounded-md font-black text-[#0070bc] bg-slate-50 focus:bg-white outline-none text-xs"
                        />
                      </div>

                      {/* Jenis Input (PANEL / METER) */}
                      <div className="flex items-center p-0.5 bg-slate-200/70 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            const newConfigs = [...configs];
                            newConfigs[idx].input_type = "PANEL";
                            setConfigs(newConfigs);
                          }}
                          className={`flex-1 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                            cfg.input_type === "PANEL"
                              ? "bg-[#0070bc] text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          PANEL
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newConfigs = [...configs];
                            newConfigs[idx].input_type = "METER";
                            setConfigs(newConfigs);
                          }}
                          className={`flex-1 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                            cfg.input_type === "METER"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          METER
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Ubah parameter di atas, lalu klik <strong>Selesai & Simpan Semua</strong>.
              </p>
              <div className="flex items-center gap-2 ml-auto sm:ml-0 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={savingConfig}
                  onClick={async () => {
                    setSavingConfig(true);
                    try {
                      const mapPcs: Record<string, number> = {};
                      const mapTypes: Record<string, string> = {};
                      configs.forEach((cfg) => {
                        mapPcs[cfg.nomor_mc] = cfg.default_pcs;
                        mapTypes[cfg.nomor_mc] = cfg.input_type;
                      });
                      localStorage.setItem(
                        "dji_machine_configs",
                        JSON.stringify(mapPcs)
                      );
                      localStorage.setItem(
                        "dji_machine_input_types",
                        JSON.stringify(mapTypes)
                      );
                    } catch (e) {}

                    await upsertAllMachineConfigs(configs);
                    setSavingConfig(false);
                    setIsConfigModalOpen(false);
                    alert("Seluruh Konfigurasi Mesin Berhasil Disimpan!");
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#0070bc] hover:bg-[#004777] active:scale-95 text-white text-xs font-bold shadow-md shadow-sky-900/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {savingConfig ? "Menyimpan..." : "Selesai & Simpan Semua"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ProductTour
        steps={MACHINE_TOUR_STEPS}
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />
    </div>
  );
}
