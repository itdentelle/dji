"use client";

import React, { useState, useEffect } from "react";
import { searchEmployeeHistory, getEmployeeHistoryDetail } from "@/actions/employee-actions";
import { Search, Loader2, RefreshCw, Calendar, Package, Filter, X, Eye, Clock, User, Hash, Box, ClipboardList, AlertCircle, ChevronDown, ChevronUp, Edit } from "lucide-react";
import { useRouter } from "next/navigation";

// Helper Fallbacks (if DB fetch fails)
const FALLBACK_OPERATORS = [
  // Shift A
  { id: 1, name: "Rohmat", shift: "A" }, { id: 2, name: "M.Alwi", shift: "A" }, { id: 3, name: "Anwar", shift: "A" },
  { id: 4, name: "Jaya", shift: "A" }, { id: 5, name: "Riki S", shift: "A" }, { id: 6, name: "Sandi M", shift: "A" },
  { id: 7, name: "Padlan", shift: "A" }, { id: 8, name: "Rissa A", shift: "A" }, { id: 9, name: "Devi K", shift: "A" },
  { id: 10, name: "Novi S", shift: "A" }, { id: 11, name: "Udin", shift: "A" },
  // Shift B
  { id: 12, name: "Irfan", shift: "B" }, { id: 13, name: "Anton", shift: "B" }, { id: 14, name: "Ahmad S", shift: "B" },
  { id: 15, name: "Saepudin", shift: "B" }, { id: 16, name: "Parid", shift: "B" }, { id: 17, name: "Noval", shift: "B" },
  { id: 18, name: "Sigit", shift: "B" }, { id: 19, name: "Rani Y", shift: "B" }, { id: 20, name: "Yanti P", shift: "B" },
  { id: 21, name: "Irma P", shift: "B" }, { id: 22, name: "Aris W", shift: "B" },
  // Shift C
  { id: 23, name: "Tubagus", shift: "C" }, { id: 24, name: "Andri Y", shift: "C" }, { id: 25, name: "Royana", shift: "C" },
  { id: 26, name: "Komara", shift: "C" }, { id: 27, name: "Sopian", shift: "C" }, { id: 28, name: "Iki S", shift: "C" },
  { id: 29, name: "Hardi", shift: "C" }, { id: 30, name: "Rini D", shift: "C" }, { id: 31, name: "Neneng", shift: "C" },
  { id: 32, name: "Rina R", shift: "C" }, { id: 33, name: "Farhan", shift: "C" }
];
const FALLBACK_DESIGNS = [
  { id: 1, name: "TCD 5826 XA" }, { id: 2, name: "DL 5675 CO" }, { id: 3, name: "DL 5167 CO" },
  { id: 4, name: "DL 5169 CO" }, { id: 5, name: "DL 6460 CR" }, { id: 6, name: "DL 5162 CO" }, { id: 7, name: "DL 5168 CO" }
];
const FALLBACK_GROUPS = [
  { id: 1, name: "A" }, { id: 2, name: "B" }, { id: 3, name: "C" }
];

export default function EmployeeHistoryPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<{
    date: string;
    nomor_mc: string;
    group_id: string;
    operator_ids: string[];
    design_id: string;
    potongan_ke: string;
    tanggal_potong: string;
    no_customer: string;
  }>({
    date: "",
    nomor_mc: "",
    group_id: "",
    operator_ids: [],
    design_id: "",
    potongan_ke: "",
    tanggal_potong: "",
    no_customer: ""
  });

  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Detail Modal State
  const [selectedHeaderId, setSelectedHeaderId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Dropdown States
  const [operators, setOperators] = useState<any[]>(FALLBACK_OPERATORS);
  const [designs, setDesigns] = useState<any[]>(FALLBACK_DESIGNS);
  const [groups, setGroups] = useState<any[]>(FALLBACK_GROUPS);

  // Load from session storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const today = new Date().toISOString().split("T")[0];
      const cachedFilters = sessionStorage.getItem("dji_history_filters");

      if (cachedFilters) {
        try {
          const parsed = JSON.parse(cachedFilters);
          if (!parsed.operator_ids) {
            parsed.operator_ids = [];
          }
          setFilters(parsed);
        } catch (e) { }
      } else {
        setFilters(prev => ({ ...prev, date: today }));
      }

      const cachedData = sessionStorage.getItem("dji_history_data");
      const cachedSearched = sessionStorage.getItem("dji_history_searched");
      if (cachedData && cachedSearched === "true") {
        try {
          const parsed = JSON.parse(cachedData);
          // Deteksi data dari tabel lama (production_reports/productions)
          if (parsed.length > 0 && parsed[0].hasOwnProperty("jml_hasil_produksi") && !parsed[0].hasOwnProperty("production_details")) {
            console.log("Old history data format detected. Clearing cache.");
            sessionStorage.removeItem("dji_history_data");
            sessionStorage.removeItem("dji_history_searched");
            setData([]);
            setHasSearched(false);
          } else {
            setData(parsed);
            setHasSearched(true);
          }
        } catch (e) {
          console.error("Failed to parse cached history");
        }
      }

      // Load dropdowns from Supabase
      async function loadDbData() {
        try {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          
          if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
            setOperators(FALLBACK_OPERATORS);
            setDesigns(FALLBACK_DESIGNS);
            setGroups(FALLBACK_GROUPS);
            return;
          }

          const { data: opData } = await supabase.from("operators").select("id, nama_operator");
          if (opData && opData.length > 0) {
            // Kita gunakan fallback dulu karena minta sesuai shift A,B,C
            // setOperators(opData.map((o: any) => ({ id: o.id, name: o.nama_operator })));
          } else {
            setOperators(FALLBACK_OPERATORS);
          }

          const { data: dsData } = await supabase.from("designs").select("id, nama_design");
          if (dsData && dsData.length > 0) setDesigns(dsData.map((d: any) => ({ id: d.id, name: d.nama_design })));
          else setDesigns(FALLBACK_DESIGNS);

          const { data: gpData } = await supabase.from("groups").select("id, nama_grup");
          if (gpData && gpData.length > 0) setGroups(gpData.map((g: any) => ({ id: g.id, name: g.nama_grup })));
          else setGroups(FALLBACK_GROUPS);
        } catch (e) {
          console.warn("Gagal fetch dropdowns, gunakan fallback", e);
          setOperators(FALLBACK_OPERATORS);
          setDesigns(FALLBACK_DESIGNS);
          setGroups(FALLBACK_GROUPS);
        }
      }
      
      loadDbData();
    }
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      sessionStorage.setItem("dji_history_filters", JSON.stringify(filters));

      const res = await searchEmployeeHistory(filters);
      if (res.success && res.data) {
        setData(res.data);
        setHasSearched(true);
        sessionStorage.setItem("dji_history_data", JSON.stringify(res.data));
        sessionStorage.setItem("dji_history_searched", "true");
      } else {
        setErrorMsg(res.error || "Gagal mengambil data riwayat.");
      }
    } catch (err: any) {
      setErrorMsg("Terjadi kesalahan jaringan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowClick = async (headerId: string) => {
    setSelectedHeaderId(headerId);
    setIsDetailLoading(true);
    setDetailData(null);

    try {
      const res = await getEmployeeHistoryDetail(headerId);
      if (res.success && res.data) {
        setDetailData(res.data);
      } else {
        alert("Gagal memuat detail: " + (res.error || "Unknown Error"));
        setSelectedHeaderId(null);
      }
    } catch (err) {
      alert("Terjadi kesalahan jaringan.");
      setSelectedHeaderId(null);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedHeaderId(null);
    setDetailData(null);
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-10">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <RefreshCw className="w-6 h-6 text-[#0070bc]" />
          Riwayat Input Produksi
        </h1>
        <p className="text-sm text-slate-500">
          Cari dan tinjau riwayat laporan produksi yang telah dikirim ke sistem.
        </p>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex flex-col gap-1 w-full sm:w-1/3">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Tanggal Produksi
              </label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:bg-white outline-none transition-all shadow-sm w-full"
              />
            </div>

            <div className="flex flex-col gap-1 w-full sm:w-1/3">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />
                Nomor Mesin
              </label>
              <select
                value={filters.nomor_mc}
                onChange={(e) => setFilters({ ...filters, nomor_mc: e.target.value })}
                className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:bg-white outline-none transition-all shadow-sm w-full"
              >
                <option value="">-- Pilih Mesin --</option>
                {["R1", "R2", "R3B", "R1C", "R2C", "R11", "R12", "R16", "T1C", "T2A", "Warping D6", "Winding"].map(mc => (
                  <option key={mc} value={mc}>{mc}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="h-11 px-6 rounded-xl bg-[#0070bc] hover:bg-[#004777] active:scale-95 disabled:opacity-50 text-white text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Mencari...</>
              ) : (
                <><Search className="w-4 h-4" /> Cari Data</>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"
            >
              <Filter className="w-4 h-4" />
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 animate-fadeIn">
              <div className="flex flex-col md:col-span-2 lg:col-span-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase">
                      Nama Operator {filters.group_id ? `(Shift ${groups.find(g => g.id.toString() === filters.group_id)?.name})` : "(Semua Shift)"}
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-white custom-scrollbar">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 px-1">
                        {(() => {
                          const activeShiftName = filters.group_id 
                            ? groups.find(g => g.id.toString() === filters.group_id)?.name 
                            : null;
                          const activeOps = activeShiftName 
                            ? operators.filter((op: any) => op.shift === activeShiftName || !op.shift)
                            : operators;
                            
                          if (activeOps.length === 0) {
                            return <div className="col-span-full text-xs text-slate-400 italic py-2 text-center">Tidak ada operator di shift ini</div>;
                          }
                          
                          return activeOps.map((op: any) => (
                            <label key={op.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition-colors">
                              <input 
                                type="checkbox" 
                                value={op.id.toString()} 
                                checked={(filters.operator_ids || []).includes(op.id.toString())}
                                onChange={(e) => {
                                  const id = op.id.toString();
                                  setFilters(prev => ({
                                    ...prev,
                                    operator_ids: e.target.checked 
                                      ? [...(prev.operator_ids || []), id]
                                      : (prev.operator_ids || []).filter(x => x !== id)
                                  }));
                                }}
                                className="w-3.5 h-3.5 text-sky-500 border-slate-300 rounded focus:ring-sky-400" 
                              />
                              <span className="truncate">{op.name || op.nama_operator}</span>
                            </label>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase">Grup Shift</label>
                    <select 
                      value={filters.group_id} 
                      onChange={e => {
                        // Jika grup diubah, kosongkan pilihan operator karena beda shift
                        setFilters({ ...filters, group_id: e.target.value, operator_ids: [] });
                      }} 
                      className="h-10 px-3 rounded-lg bg-white border border-slate-200 text-sm focus:border-sky-400 outline-none"
                    >
                      <option value="">Semua Grup</option>
                      {groups.map(g => <option key={g.id} value={g.id.toString()}>Grup {g.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Design</label>
                <input type="text" value={filters.design_id} onChange={e => setFilters({ ...filters, design_id: e.target.value })} className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold outline-none focus:border-sky-400 w-full" placeholder="Cari Design..." />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Potongan Ke</label>
                <input type="number" value={filters.potongan_ke} onChange={e => setFilters({ ...filters, potongan_ke: e.target.value })} className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold outline-none focus:border-sky-400 w-full" placeholder="Cari Potongan..." />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">No Customer</label>
                <input type="text" value={filters.no_customer} onChange={e => setFilters({ ...filters, no_customer: e.target.value })} className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold outline-none focus:border-sky-400 w-full" placeholder="Cari No Cust..." />
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium">
          {errorMsg}
        </div>
      )}

      {/* Table Container */}
      {hasSearched ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {data.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <Package className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">Tidak ada riwayat.</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Belum ada data produksi yang sesuai dengan filter pencarian Anda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-2.5 pl-6">Waktu Input</th>
                    <th className="px-4 py-2.5">Mesin</th>
                    <th className="px-4 py-2.5">Operator</th>
                    <th className="px-4 py-2.5">Grup</th>
                    <th className="px-4 py-2.5">Design</th>
                    <th className="px-4 py-2.5">Panel/Pot</th>
                    <th className="px-4 py-2.5">Masalah</th>
                    <th className="px-4 py-2.5">Downtime</th>
                    <th className="px-4 py-2.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {data.map((row: any, idx) => {
                    let jam = "-";
                    if (row.tanggal_jam) {
                      const dateObj = new Date(row.tanggal_jam);
                      if (!isNaN(dateObj.getTime())) {
                        jam = dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
                      } else {
                        jam = row.tanggal_jam.split(/[ T]/)[1] || "-";
                      }
                    }

                    const operatorName = row.pic || (row.operators ? row.operators.nama_operator : null);

                    // Extract unique problems
                    let problems: string[] = [];
                    if (row.production_details && Array.isArray(row.production_details)) {
                      const allProbs = row.production_details
                        .map((d: any) => d.kategori_masalah)
                        .filter(Boolean)
                        .flatMap((p: string) => p.split(',').map(s => s.trim()));
                      problems = Array.from(new Set(allProbs));
                    }

                    return (
                      <tr key={idx} onClick={() => handleRowClick(row.id)} className="hover:bg-sky-50/50 cursor-pointer transition-colors group">
                        <td className="px-4 py-2 pl-6 whitespace-nowrap">
                          <span className="font-bold text-slate-800">{jam}</span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className="font-bold text-[#0070bc]">{row.nomor_mc || "-"}</span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {operatorName || <span className="text-slate-400 italic">No Name</span>}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className="font-semibold text-slate-600">{row.groups?.nama_grup || row.group_id || "-"}</span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap max-w-[120px] truncate" title={row.designs?.nama_design || row.design_id || "-"}>
                          <span className="font-semibold text-slate-600">{row.designs?.nama_design || row.design_id || "-"}</span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${row.panel_no === "METERAN" ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"}`}>
                            {row.panel_no === "METERAN" ? "-" : (row.panel_no || "-")} / {row.potongan_ke || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap max-w-[150px] truncate" title={problems.length > 0 ? problems.join(', ') : "Normal"}>
                          {problems.length > 0 ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-50 text-red-600 border border-red-100">
                              {problems.length > 1 ? `${problems[0]} +${problems.length - 1}` : problems[0]}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {row.total_downtime_detik ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-50 text-orange-600 border border-orange-100">
                              {row.total_downtime_detik}s
                            </span>
                          ) : (
                            <span className="text-slate-300 font-bold">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-center">
                          <button className="p-1 rounded-md bg-white border border-slate-200 text-slate-400 group-hover:text-[#0070bc] group-hover:border-[#0070bc]/30 transition-all shadow-sm">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="p-10 flex flex-col items-center justify-center text-center bg-white rounded-2xl shadow-sm border border-slate-200 border-dashed">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
            <Search className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">Siap Mencari Data</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Gunakan filter di atas untuk mencari riwayat spesifik yang Anda butuhkan.
          </p>
        </div>
      )}

      {/* Modal Detail */}
      {selectedHeaderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn overflow-y-auto" onClick={closeModal}>
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col my-auto animate-scaleIn overflow-hidden max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {isDetailLoading ? (
              <div className="p-20 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-[#0070bc] mb-4" />
                <span className="text-slate-500 font-medium">Memuat Detail...</span>
              </div>
            ) : detailData ? (
              <>
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800">Detail Laporan Produksi</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">ID: {detailData.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/edit/${detailData.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold text-xs transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit Data
                    </button>
                    <button onClick={closeModal} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/30">
                  {/* Info Header */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mesin & Grup</p>
                      <p className="text-sm font-bold text-slate-800">{detailData.nomor_mc || "-"} / Grup {detailData.groups?.nama_grup || detailData.group_id}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Operator</p>
                      <p className="text-sm font-bold text-slate-800">{detailData.pic || detailData.operators?.nama_operator || "No Name"}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Design</p>
                      <p className="text-sm font-bold text-slate-800">{detailData.designs?.nama_design || detailData.design_id || "-"}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total PCS</p>
                      <p className="text-sm font-bold text-[#0070bc]">{detailData.pcs} PCS</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Spesifikasi Panel */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Box className="w-4 h-4" /> Spesifikasi Produksi
                      </h4>
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-sm">
                        <div className="flex justify-between p-3 border-b border-slate-100">
                          <span className="text-slate-500">Panel / Potongan</span>
                          <span className="font-bold text-slate-800">
                            {detailData.panel_no === "METERAN" ? "-" : (detailData.panel_no || "-")} / {detailData.potongan_ke || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between p-3 border-b border-slate-100">
                          <span className="text-slate-500">Course / RPM</span>
                          <span className="font-bold text-slate-800">{detailData.course || "-"} / {detailData.rpm || "-"}</span>
                        </div>
                        <div className="flex justify-between p-3 border-b border-slate-100">
                          <span className="text-slate-500">No. Customer</span>
                          <span className="font-bold text-slate-800">{detailData.no_customer || "-"}</span>
                        </div>
                        <div className="flex justify-between p-3 border-b border-slate-100">
                          <span className="text-slate-500">No. Order</span>
                          <span className="font-bold text-slate-800">{detailData.no_order_barang || "-"}</span>
                        </div>
                        <div className="flex justify-between p-3 border-b border-slate-100">
                          <span className="text-slate-500">Tanggal Potong</span>
                          <span className="font-bold text-slate-800">{detailData.tanggal_potong || "-"}</span>
                        </div>
                        <div className="flex justify-between p-3 border-b border-slate-100">
                          <span className="text-slate-500">Status Matching</span>
                          <span className="font-bold text-slate-800">{detailData.status_matching || "-"}</span>
                        </div>
                        <div className="flex justify-between p-3">
                          <span className="text-slate-500">Pick</span>
                          <span className="font-bold text-slate-800">{detailData.pick || "-"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Benang & Material */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" /> Benang & Material
                      </h4>
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-sm">
                        <div className="flex justify-between p-3 border-b border-slate-100">
                          <span className="text-slate-500">Benang Dasar</span>
                          <span className="font-bold text-slate-800">{detailData.jenis_benang_dasar || "-"}</span>
                        </div>
                        <div className="flex justify-between p-3 border-b border-slate-100">
                          <span className="text-slate-500">Liner</span>
                          <span className="font-bold text-slate-800">{detailData.liner || "-"}</span>
                        </div>
                        <div className="flex justify-between p-3 border-b border-slate-100">
                          <span className="text-slate-500">Heavy</span>
                          <span className="font-bold text-slate-800">{detailData.heavy || "-"}</span>
                        </div>
                        <div className="flex justify-between p-3 border-b border-slate-100">
                          <span className="text-slate-500">Shadow</span>
                          <span className="font-bold text-slate-800">{detailData.shadow || "-"}</span>
                        </div>
                        <div className="flex justify-between p-3">
                          <span className="text-slate-500">Pinggiran</span>
                          <span className="font-bold text-slate-800">{detailData.pinggiran || "-"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Downtime Info */}
                  {detailData.total_downtime_detik > 0 && (
                    <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                      <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-800">Total Downtime: {detailData.total_downtime_detik} Detik</h4>
                        <p className="text-xs text-amber-700 mt-1">Terdapat waktu tunggu (downtime) selama produksi sesi ini berjalan.</p>
                      </div>
                    </div>
                  )}

                  {/* Detail PCS */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4" /> Rincian per PCS
                    </h4>

                    {detailData.details && detailData.details.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {detailData.details.map((pcs: any, idx: number) => (
                          <div key={idx} className={`p-4 rounded-xl border shadow-sm ${pcs.kategori_masalah ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-200'}`}>
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                                PCS #{pcs.pcs_index}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                {pcs.jml_hasil_produksi || 1} Hasil
                              </span>
                            </div>

                            {pcs.kategori_masalah ? (
                              <div className="space-y-2 mt-2 pt-2 border-t border-red-100/50">
                                <div className="flex gap-2">
                                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-red-400 uppercase">Kategori Masalah</span>
                                    <span className="text-xs font-semibold text-red-700">{pcs.kategori_masalah}</span>
                                  </div>
                                </div>
                                {pcs.detail_masalah && (
                                  <div className="pl-6 text-xs text-slate-600">
                                    <span className="font-semibold">Detail:</span> {pcs.detail_masalah}
                                  </div>
                                )}
                                {pcs.keterangan_cacat && (
                                  <div className="pl-6 text-xs text-slate-600">
                                    <span className="font-semibold">Cacat:</span> {pcs.keterangan_cacat}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2 text-emerald-600">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-xs font-semibold">Produksi Normal / Sukses</span>
                              </div>
                            )}

                            {pcs.meter_kain && (
                              <div className="mt-2 text-xs font-semibold text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                Meter: {pcs.meter_kain}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">Tidak ada rincian PCS yang disimpan.</p>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
