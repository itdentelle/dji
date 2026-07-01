"use client";

import React, { useState, useEffect } from "react";
import { searchQCHistory } from "@/actions/qc-actions";
import { Search, Loader2, RefreshCw, Calendar, Package, Filter, X, Eye, Clock, User, Hash, Box, ClipboardList, AlertCircle, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import QCDetailModal from "@/components/QCDetailModal";

const QC_OPERATORS = [
  { id: "Nurdin", name: "Nurdin" },
  { id: "Hendra", name: "Hendra" },
  { id: "Taufik", name: "Taufik" }
];

export default function QCHistoryPage() {
  const [filters, setFilters] = useState<{
    date: string;
    nomor_mc: string;
    petugas_ids: string[];
    design_id: string;
    potongan_ke: string;
    no_customer: string;
  }>({
    date: "",
    nomor_mc: "",
    petugas_ids: [],
    design_id: "",
    potongan_ke: "",
    no_customer: ""
  });

  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Detail Modal State
  const [selectedData, setSelectedData] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load from session storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const today = new Date().toISOString().split("T")[0];
      const cachedFilters = sessionStorage.getItem("dji_qc_history_filters");

      if (cachedFilters) {
        try {
          const parsed = JSON.parse(cachedFilters);
          if (!parsed.petugas_ids) parsed.petugas_ids = [];
          setFilters(parsed);
        } catch (e) { }
      } else {
        setFilters(prev => ({ ...prev, date: today }));
      }

      const cachedData = sessionStorage.getItem("dji_qc_history_data");
      const cachedSearched = sessionStorage.getItem("dji_qc_history_searched");
      if (cachedData && cachedSearched === "true") {
        try {
          setData(JSON.parse(cachedData));
          setHasSearched(true);
        } catch (e) {
          console.error("Failed to parse cached history");
        }
      }
    }
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      sessionStorage.setItem("dji_qc_history_filters", JSON.stringify(filters));

      const res = await searchQCHistory(filters);
      if (res.success && res.data) {
        setData(res.data);
        setHasSearched(true);
        sessionStorage.setItem("dji_qc_history_data", JSON.stringify(res.data));
        sessionStorage.setItem("dji_qc_history_searched", "true");
      } else {
        setErrorMsg(res.error || "Gagal mengambil data riwayat.");
      }
    } catch (err: any) {
      setErrorMsg("Terjadi kesalahan jaringan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDetail = (group: any) => {
    setSelectedData(group);
    setIsModalOpen(true);
  };

  const groupedData = data;

  return (
    <div className="w-full max-w-6xl mx-auto pb-20 animate-fadeIn">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <RefreshCw className="w-6 h-6 text-[#0070bc]" />
          Riwayat Inspeksi QC
        </h1>
        <p className="text-sm text-slate-500">
          Cari dan tinjau riwayat inspeksi QC per panel yang telah dikirim ke sistem.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Filter Card */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex flex-col gap-1 w-full sm:w-1/3">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Tanggal Inspeksi
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
                <option value="">-- Semua Mesin --</option>
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
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-4 h-4" />}
              Cari Data
            </button>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition-all shadow-sm flex items-center gap-2 shrink-0 hidden sm:flex"
            >
              <Filter className="w-4 h-4" />
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="h-11 px-4 w-full rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition-all shadow-sm flex items-center justify-center gap-2 sm:hidden"
          >
            <Filter className="w-4 h-4" />
            Filter Lanjutan {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Advanced Filters Container */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showAdvanced ? "max-h-[800px] opacity-100 mt-2" : "max-h-0 opacity-0"}`}>
            <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200 space-y-5">
              
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="w-full">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5 mb-3">
                    <User className="w-3.5 h-3.5" /> Petugas QC
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {QC_OPERATORS.map(op => (
                      <label key={op.id} className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input 
                            type="checkbox" 
                            className="peer sr-only"
                            checked={filters.petugas_ids.includes(op.id.toString())}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilters({...filters, petugas_ids: [...filters.petugas_ids, op.id.toString()]});
                              } else {
                                setFilters({...filters, petugas_ids: filters.petugas_ids.filter(id => id !== op.id.toString())});
                              }
                            }}
                          />
                          <div className="w-5 h-5 rounded bg-white border border-slate-300 peer-checked:bg-[#0070bc] peer-checked:border-[#0070bc] transition-all flex items-center justify-center">
                            <X className={`w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity ${filters.petugas_ids.includes(op.id.toString()) ? 'rotate-45' : ''}`} style={filters.petugas_ids.includes(op.id.toString()) ? { transform: 'none' } : {}} />
                            {filters.petugas_ids.includes(op.id.toString()) && (
                              <svg className="w-3 h-3 text-white absolute inset-0 m-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-slate-700 font-medium group-hover:text-slate-900 transition-colors">{op.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200/60 pt-5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Design</label>
                  <input
                    type="text"
                    placeholder="Cari Design..."
                    value={filters.design_id}
                    onChange={(e) => setFilters({ ...filters, design_id: e.target.value })}
                    className="h-10 px-3 rounded-lg bg-white border border-slate-200 text-sm focus:border-sky-400 outline-none w-full"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Potongan Ke</label>
                  <input
                    type="number"
                    placeholder="Cari Potongan..."
                    value={filters.potongan_ke}
                    onChange={(e) => setFilters({ ...filters, potongan_ke: e.target.value })}
                    className="h-10 px-3 rounded-lg bg-white border border-slate-200 text-sm focus:border-sky-400 outline-none w-full"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">No Customer</label>
                  <input
                    type="text"
                    placeholder="Cari No Cust..."
                    value={filters.no_customer}
                    onChange={(e) => setFilters({ ...filters, no_customer: e.target.value })}
                    className="h-10 px-3 rounded-lg bg-white border border-slate-200 text-sm focus:border-sky-400 outline-none w-full"
                  />
                </div>
              </div>

            </div>
          </div>
        </form>
      </div>

      {/* Result Section */}
      {hasSearched && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
              Hasil Pencarian
            </h2>
            <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
              {groupedData.length} Data Ditemukan
            </div>
          </div>

          {groupedData.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-4">Tanggal & Waktu</th>
                      <th className="px-6 py-4">Mesin & Desain</th>
                      <th className="px-6 py-4">Petugas QC</th>
                      <th className="px-6 py-4">Panel / PCS</th>
                      <th className="px-6 py-4 text-center">Hasil Inspeksi</th>
                      <th className="px-6 py-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groupedData.map((group: any, idx: number) => {
                      const header = group.header || {};
                      
                      return (
                        <tr key={idx} className="hover:bg-sky-50/50 transition-colors group/row">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800">{group.tanggal_inspeksi}</div>
                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" /> {group.start_inspect || "-"} - {group.finish_inspect || "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800">{group.nomor_mc || "-"}</div>
                            <div className="text-xs text-slate-500">{group.design_id || "-"}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800">{group.petugas_inspeksi || "-"}</div>
                            {group.petugas_inspeksi_2 && (
                              <div className="text-xs text-slate-500">& {group.petugas_inspeksi_2}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800 flex flex-col">
                              <span>PCS Ke-{group.pcs_index || group.detail?.pcs_index}</span>
                              <span className="text-xs text-slate-500 font-medium mt-0.5">{group.items?.length || 0} Panel</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="text-sm font-bold text-slate-800 flex items-center justify-center gap-3">
                              {group.inspeksi_silang === 0 ? (
                                <span className="flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  ALL OK
                                </span>
                              ) : (
                                <>
                                  <span className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    {group.inspeksi_ceklis}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <XCircle className="w-4 h-4 text-rose-500" />
                                    {group.inspeksi_silang}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleOpenDetail(group)}
                              className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-[#0070bc] hover:border-[#0070bc] hover:bg-sky-50 rounded-lg transition-all shadow-sm group-hover/row:shadow-md"
                              title="Lihat Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                <Package className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">Data Tidak Ditemukan</h3>
              <p className="text-slate-500 text-sm max-w-sm">
                Tidak ada data riwayat QC yang sesuai dengan kriteria filter Anda. Silakan coba sesuaikan filter pencarian.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <QCDetailModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        qcData={selectedData}
      />
    </div>
  );
}
