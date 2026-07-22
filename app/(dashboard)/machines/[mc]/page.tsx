"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  getMachineBlockAnalytics,
  BlockSummary,
  BlockProblemItem,
} from "@/actions/dashboard-actions";
import {
  ArrowLeft,
  Box,
  AlertTriangle,
  Clock,
  TrendingUp,
  Search,
  Wrench,
  ChevronRight,
  Filter,
  Calendar,
  Layers,
  User,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface PageProps {
  params: Promise<{ mc: string }>;
}

export default function MachineBlockAnalyticsPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const nomorMc = decodeURIComponent(resolvedParams.mc || "");

  const [daysBack, setDaysBack] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<BlockSummary[]>([]);
  const [allEvents, setAllEvents] = useState<BlockProblemItem[]>([]);
  const [stats, setStats] = useState<{
    totalProblems: number;
    totalDurationSec: number;
    topProblematicBlock: string;
    topCategory: string;
  }>({
    totalProblems: 0,
    totalDurationSec: 0,
    topProblematicBlock: "-",
    topCategory: "-",
  });

  const [selectedBlockFilter, setSelectedBlockFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMachineBlockAnalytics(nomorMc, daysBack);
      if (res.success) {
        setSummary(res.summary || []);
        setAllEvents(res.allEvents || []);
        setStats(
          res.stats || {
            totalProblems: 0,
            totalDurationSec: 0,
            topProblematicBlock: "-",
            topCategory: "-",
          }
        );
      } else {
        setError(res.error || "Gagal memuat analisis blok.");
      }
    } catch (e: any) {
      setError(e.message || "Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (nomorMc) {
      fetchAnalytics();
    }
  }, [nomorMc, daysBack]);

  const formatDurationNice = (totalSec: number) => {
    if (totalSec <= 0) return "0 Dtk";
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) {
      if (minutes > 0) return `${hours} Jam ${minutes} Mnt`;
      return `${hours} Jam`;
    }
    if (minutes > 0) {
      if (seconds > 0) return `${minutes} Mnt ${seconds} Dtk`;
      return `${minutes} Mnt`;
    }
    return `${seconds} Dtk`;
  };

  const filteredEvents = allEvents.filter((ev) => {
    const matchesBlock =
      selectedBlockFilter === "all" || ev.blok === selectedBlockFilter;
    const matchesSearch =
      searchQuery.trim() === "" ||
      ev.blok.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.kategori.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.detail_masalah.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.operator.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBlock && matchesSearch;
  });

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBlockFilter, searchQuery, perPage]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / perPage));
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 animate-in fade-in">
      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/machines")}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-all shadow-sm"
            title="Kembali ke Monitoring Mesin"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-0.5">
              <span
                onClick={() => router.push("/machines")}
                className="hover:text-blue-600 cursor-pointer transition-colors"
              >
                Monitoring Mesin
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-blue-600">Analisis Blok {nomorMc}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Analisis Masalah Per-Blok
              <span className="bg-blue-600 text-white font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                {nomorMc}
              </span>
            </h1>
          </div>
        </div>

        {/* Filter Period */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm self-stretch sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 text-xs font-bold text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Periode:</span>
          </div>
          <select
            value={daysBack}
            onChange={(e) => setDaysBack(Number(e.target.value))}
            className="h-9 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg outline-none cursor-pointer transition-colors border-0"
          >
            <option value={7}>7 Hari Terakhir</option>
            <option value={30}>30 Hari Terakhir</option>
            <option value={90}>90 Hari Terakhir</option>
            <option value={365}>1 Tahun Terakhir</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-center gap-3 mb-6 font-semibold text-sm">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Blok Paling Sering Bermasalah
            </span>
            <div className="text-xl font-black text-red-600 truncate mt-0.5">
              {stats.topProblematicBlock}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Waktu Downtime
            </span>
            <div className="text-xl font-black text-slate-800 mt-0.5">
              {formatDurationNice(stats.totalDurationSec)}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Kejadian Masalah
            </span>
            <div className="text-2xl font-black text-slate-800 mt-0.5">
              {stats.totalProblems}{" "}
              <span className="text-xs font-bold text-slate-400">Kejadian</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Kategori Utama
            </span>
            <div className="text-lg font-extrabold text-purple-700 truncate mt-0.5">
              {stats.topCategory}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-bold text-slate-500">
            Memuat analisis frekuensi blok untuk Mesin {nomorMc}...
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* RANKING BLOK BERMASALAH */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                  <Box className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold">
                    Peringkat Frekuensi Masalah Per-Blok (Mesin {nomorMc})
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    Urutan blok dari yang paling sering mengalami perbaikan / downtime
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-slate-800 text-slate-300 px-3 py-1 rounded-full">
                {summary.length} Blok Terdeteksi
              </span>
            </div>

            <div className="p-6">
              {summary.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-medium">
                  🎉 Tidak ada catatan masalah per-blok pada Mesin {nomorMc} untuk periode ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {summary.map((item, idx) => {
                    const percentage = Math.round(
                      (item.total_kejadian / (stats.totalProblems || 1)) * 100
                    );
                    const isSelected = selectedBlockFilter === item.blok;

                    return (
                      <div
                        key={item.blok}
                        onClick={() =>
                          setSelectedBlockFilter(
                            isSelected ? "all" : item.blok
                          )
                        }
                        className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                idx === 0
                                  ? "bg-red-500 text-white shadow-sm"
                                  : idx === 1
                                  ? "bg-amber-500 text-white shadow-sm"
                                  : idx === 2
                                  ? "bg-yellow-500 text-white shadow-sm"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              #{idx + 1}
                            </span>
                            <div>
                              <h3 className="text-base font-black text-slate-800 tracking-tight">
                                {item.blok}
                              </h3>
                              <span className="text-[11px] font-semibold text-slate-500">
                                Kategori Utama:{" "}
                                <strong className="text-slate-700">
                                  {item.kategori_utama}
                                </strong>
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-lg font-black text-red-600 block leading-tight">
                              {item.total_kejadian}{" "}
                              <span className="text-xs font-bold text-slate-500">
                                Kali
                              </span>
                            </span>
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 inline-block mt-0.5">
                              ⏱ {formatDurationNice(item.total_durasi_detik)}
                            </span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                            <span>Konsentrasi Masalah</span>
                            <span>{percentage}% Dari Total</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                idx === 0
                                  ? "bg-red-500"
                                  : idx === 1
                                  ? "bg-amber-500"
                                  : "bg-blue-500"
                              }`}
                              style={{ width: `${Math.max(percentage, 5)}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {item.operator_terbanyak}
                          </span>
                          <span className="text-blue-600 font-bold hover:underline">
                            {isSelected ? "Tampilkan Semua Blok" : "Filter Tabel →"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* TABEL RINCIAN RIWAYAT MASALAH */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Rincian Riwayat Masalah ({filteredEvents.length})
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedBlockFilter !== "all"
                    ? `Menampilkan catatan khusus untuk ${selectedBlockFilter}`
                    : "Menampilkan seluruh riwayat masalah per-blok pada mesin ini"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {selectedBlockFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedBlockFilter("all")}
                    className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold hover:bg-blue-200 transition-colors"
                  >
                    Reset Filter ({selectedBlockFilter}) ✕
                  </button>
                )}

                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari blok, kategori, operator..."
                    className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-white font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Waktu</th>
                    <th className="px-5 py-3.5">Lokasi / Nomor Blok</th>
                    <th className="px-5 py-3.5">Potongan Ke</th>
                    <th className="px-5 py-3.5">Operator / Penanggung Jawab</th>
                    <th className="px-5 py-3.5">Durasi Downtime</th>
                    <th className="px-5 py-3.5">Kategori Masalah</th>
                    <th className="px-5 py-3.5">Detail Masalah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedEvents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-10 text-slate-400 font-medium"
                      >
                        Tidak ada riwayat masalah yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    paginatedEvents.map((ev) => (
                      <tr
                        key={ev.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-5 py-3.5 font-bold text-slate-700">
                          {ev.tanggal_jam}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-extrabold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
                            {ev.blok}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-amber-700">
                          {ev.potongan_ke}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-800">
                          {ev.operator}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                            ⏱ {formatDurationNice(ev.durasi_detik)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                            {ev.kategori}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-700 max-w-xs truncate">
                          {ev.detail_masalah}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredEvents.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200 bg-slate-50">
                <div className="text-xs font-semibold text-slate-600">
                  Menampilkan {(currentPage - 1) * perPage + 1} - {Math.min(currentPage * perPage, filteredEvents.length)} dari {filteredEvents.length} Riwayat
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={perPage}
                    onChange={(e) => setPerPage(Number(e.target.value))}
                    className="h-9 px-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold outline-none"
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n}>{n} / halaman</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="h-9 px-3 rounded-lg bg-white border border-slate-200 text-xs font-bold disabled:opacity-50 hover:bg-slate-100 transition-colors"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-bold text-slate-700">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="h-9 px-3 rounded-lg bg-white border border-slate-200 text-xs font-bold disabled:opacity-50 hover:bg-slate-100 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
