"use client";

import React, { useState, useEffect } from "react";
import { Search, Loader2, Eye, History, FileText, ClipboardCheck, AlertTriangle } from "lucide-react";
import { getAvailableHistoryQCDesignPotongan, getQCHistoryByBatch } from "@/actions/qc-actions";
import QCDetailModal from "@/components/QCDetailModal";

export default function QCHistoryPage() {
  const [availableHeaders, setAvailableHeaders] = useState<any[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);

  const [searchDesain, setSearchDesain] = useState("");
  const [searchPotongan, setSearchPotongan] = useState("");
  const [selectedPcsIndex, setSelectedPcsIndex] = useState("");

  const [allHistory, setAllHistory] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedData, setSelectedData] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch available filters on mount
  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    setIsLoadingFilters(true);
    try {
      const res = await getAvailableHistoryQCDesignPotongan();
      if (res.success && res.data) {
        setAvailableHeaders(res.data);
      }
    } catch (err) {
      console.error("Gagal mengambil opsi filter history:", err);
    } finally {
      setIsLoadingFilters(false);
    }
  };

  const uniqueDesigns = Array.from(new Set(availableHeaders.map(h => h.design_id))).filter(Boolean).sort();
  const availablePotongans = Array.from(
    new Set(availableHeaders.filter(h => h.design_id === searchDesain).map(h => h.potongan_ke))
  ).filter(Boolean).sort();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchDesain || !searchPotongan) {
      setErrorMsg("Desain dan Potongan harus dipilih!");
      return;
    }

    setIsSearching(true);
    setErrorMsg(null);
    setAllHistory([]);
    setSelectedPcsIndex("");

    try {
      const res = await getQCHistoryByBatch(searchDesain, searchPotongan);
      if (res.success && res.data) {
        if (res.data.length === 0) {
          setErrorMsg("Tidak ada riwayat QC untuk Desain & Potongan tersebut.");
        } else {
          setAllHistory(res.data);
        }
      } else {
        setErrorMsg(res.error || "Gagal mencari data riwayat.");
      }
    } catch (err) {
      setErrorMsg("Terjadi kesalahan jaringan.");
    } finally {
      setIsSearching(false);
    }
  };

  const uniquePcsIndexes = Array.from(new Set(allHistory.map(d => d.detail?.pcs_index))).filter(Boolean).sort((a: any, b: any) => a - b);
  
  // Filter by selected PCS if any is selected
  const historyToDisplay = selectedPcsIndex 
    ? allHistory.filter(d => String(d.detail?.pcs_index) === selectedPcsIndex)
    : allHistory;

  const handleOpenDetail = (data: any) => {
    setSelectedData(data);
    setIsModalOpen(true);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fadeIn pb-20">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-2">
          <History className="w-6 h-6 text-[#0070bc]" />
          Riwayat Inspeksi QC
        </h1>
        <p className="text-sm text-slate-500">
          Pilih Desain & Potongan yang tersedia, lalu pilih Nomor PCS untuk melihat daftar panel yang telah selesai diinspeksi.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Filter Card */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex flex-col gap-1 w-full sm:w-1/3">
            <label className="text-xs font-bold text-slate-500 uppercase">Desain ID</label>
            <select
              value={searchDesain}
              onChange={(e) => {
                setSearchDesain(e.target.value);
                setSearchPotongan(""); 
              }}
              disabled={isLoadingFilters}
              className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:bg-white outline-none w-full"
            >
              <option value="">-- Pilih Desain --</option>
              {uniqueDesigns.map(d => (
                <option key={String(d)} value={String(d)}>{String(d)}</option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col gap-1 w-full sm:w-1/3">
            <label className="text-xs font-bold text-slate-500 uppercase">Potongan Ke</label>
            <select
              value={searchPotongan}
              onChange={(e) => setSearchPotongan(e.target.value)}
              disabled={!searchDesain || isLoadingFilters}
              className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:bg-white outline-none w-full"
            >
              <option value="">-- Pilih Potongan --</option>
              {availablePotongans.map(p => (
                <option key={String(p)} value={String(p)}>{String(p)}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={!searchDesain || !searchPotongan || isSearching}
            className="h-11 px-6 rounded-xl bg-[#0070bc] hover:bg-[#005a96] text-white text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all w-full sm:w-auto"
          >
            {isSearching ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Tampilkan"}
          </button>
        </form>
      </div>

      {/* Tampilan Riwayat (PCS Dropdown & Table) */}
      {allHistory.length > 0 && (
        <div className="space-y-6 animate-fadeIn">
          {/* Filter PCS */}
          <div className="bg-[#0070bc]/5 border border-[#0070bc]/20 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[#0070bc] uppercase tracking-wider mb-1">Filter Nomor PCS</p>
              <select
                value={selectedPcsIndex}
                onChange={(e) => setSelectedPcsIndex(e.target.value)}
                className="h-11 px-4 min-w-[200px] rounded-xl bg-white border border-[#0070bc]/30 text-[#0070bc] font-extrabold focus:outline-none focus:ring-2 focus:ring-[#0070bc]/20"
              >
                <option value="">-- Tampilkan Semua PCS --</option>
                {uniquePcsIndexes.map(p => (
                  <option key={String(p)} value={String(p)}>PCS Ke-{String(p)}</option>
                ))}
              </select>
            </div>
            
            <div className="text-right">
              <p className="text-xs font-bold text-slate-500 uppercase">Total Data Tampil</p>
              <p className="text-xl font-black text-slate-800">{historyToDisplay.length} Panel</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Tanggal & Waktu</th>
                    <th className="px-6 py-4">Petugas</th>
                    <th className="px-6 py-4">Panel / PCS</th>
                    <th className="px-6 py-4 text-center">Hasil Inspeksi</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyToDisplay.length > 0 ? (
                    historyToDisplay.map((d, idx) => {
                      const header = d.header || {};
                      const detail = d.detail || {};
                      
                      let gradeColor = "bg-slate-100 text-slate-700";
                      let gradeText = "-";
                      if (detail.final_inspection_id === 1) {
                        gradeColor = "bg-emerald-100 text-emerald-700";
                        gradeText = "Grade A";
                      } else if (detail.final_inspection_id === 2) {
                        gradeColor = "bg-amber-100 text-amber-700";
                        gradeText = "Grade B";
                      } else if (detail.final_inspection_id === 3) {
                        gradeColor = "bg-rose-100 text-rose-700";
                        gradeText = "Grade BS";
                      }

                      return (
                        <tr key={d.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-slate-800">{d.tanggal_inspeksi}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{d.start_inspect} - {d.finish_inspect}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs font-bold text-slate-700">{d.petugas_inspeksi}</div>
                            {d.petugas_inspeksi_2 && (
                              <div className="text-[10px] text-slate-400 mt-0.5">& {d.petugas_inspeksi_2}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="inline-flex items-center justify-center h-6 px-2 rounded-md bg-slate-100 text-slate-700 font-bold text-xs">
                              {header.panel_no === "METERAN" ? "Roll " + detail.roll_no : "Panel " + header.panel_no}
                            </div>
                            <div className="text-[10px] text-[#0070bc] font-bold mt-1 uppercase tracking-wider">
                              PCS Ke-{detail.pcs_index}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${gradeColor}`}>
                              {gradeText}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleOpenDetail(d)}
                              className="p-2 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-[#0070bc] hover:border-[#0070bc]/30 transition-all shadow-sm group mx-auto"
                              title="Lihat Detail Inspeksi"
                            >
                              <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <p className="text-sm text-slate-500 font-medium">Tidak ada panel yang sesuai filter.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
