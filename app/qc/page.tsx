"use client";

import React, { useState, useEffect } from "react";
import { Search, Loader2, ClipboardCheck, AlertTriangle, CheckCircle, Package, Eye } from "lucide-react";
import QCInspectionModal from "@/components/forms/QCInspectionModal";
import ProductionDetailModal from "@/components/ProductionDetailModal";
import { getPendingQCDetailsByBatch, getAvailableQCFilters } from "@/actions/qc-actions";
import { getEmployeeHistoryDetail } from "@/actions/employee-actions";

export default function QCPage() {
  const [searchDesain, setSearchDesain] = useState("");
  const [searchPotongan, setSearchPotongan] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [availableFilters, setAvailableFilters] = useState<{ design_id: string; potongan_ke: string }[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);

  useEffect(() => {
    const loadFilters = async () => {
      const res = await getAvailableQCFilters();
      if (res.success && res.data) {
        setAvailableFilters(res.data);
      }
      setIsLoadingFilters(false);
    };
    loadFilters();
  }, []);

  const uniqueDesigns = Array.from(new Set(availableFilters.map(f => f.design_id)));
  const availablePotongans = searchDesain 
    ? availableFilters.filter(f => f.design_id === searchDesain).map(f => f.potongan_ke) 
    : [];

  // All pending details for the selected Design & Potongan
  const [allDetails, setAllDetails] = useState<any[]>([]);
  const [selectedPcsIndex, setSelectedPcsIndex] = useState<string>("");
  
  // Map of detailId -> finalInspectionId (1, 2, or 3)
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchDesain || !searchPotongan) {
      setErrorMsg("Desain dan Potongan harus dipilih!");
      return;
    }

    setIsSearching(true);
    setErrorMsg(null);
    setAllDetails([]);
    setSelectedPcsIndex("");
    setSelections({});

    const res = await getPendingQCDetailsByBatch(searchDesain, searchPotongan);
    if (res.success && res.data) {
      if (res.data.length === 0) {
        setErrorMsg("Tidak ada antrean QC untuk Desain & Potongan tersebut.");
      } else {
        setAllDetails(res.data);
      }
    } else {
      setErrorMsg(res.error || "Gagal mencari data.");
    }
    setIsSearching(false);
  };

  // Derive available PCS indexes from allDetails
  const uniquePcsIndexes = Array.from(new Set(allDetails.map(d => d.pcs_index))).sort((a, b) => a - b);

  // Filter details by selected PCS
  const detailsToDisplay = allDetails.filter(d => String(d.pcs_index) === selectedPcsIndex);

  const handleSelectGrade = (detailId: string, grade: number) => {
    setSelections(prev => ({ ...prev, [detailId]: grade }));
  };

  // Auto-select Grade A if there are no problems
  useEffect(() => {
    if (detailsToDisplay.length > 0) {
      setSelections(prev => {
        const newSelections = { ...prev };
        let hasChanges = false;
        
        detailsToDisplay.forEach(d => {
          const hasProblem = !!d.kategori_masalah || !!d.detail_masalah || !!d.keterangan_cacat;
          // If no problem and not already selected, auto-select Grade A (1)
          if (!hasProblem && !newSelections[d.id]) {
            newSelections[d.id] = 1; 
            hasChanges = true;
          }
        });
        
        return hasChanges ? newSelections : prev;
      });
    }
  }, [detailsToDisplay]);

  const handleOpenDetail = async (headerId: string) => {
    setDetailModalOpen(true);
    setIsDetailLoading(true);
    setDetailData(null);
    try {
      const res = await getEmployeeHistoryDetail(headerId);
      if (res.success && res.data) {
        setDetailData(res.data);
      } else {
        alert("Gagal memuat detail: " + (res.error || "Unknown Error"));
        setDetailModalOpen(false);
      }
    } catch (err) {
      alert("Terjadi kesalahan jaringan.");
      setDetailModalOpen(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const isAllSelected = detailsToDisplay.length > 0 && detailsToDisplay.every(d => selections[d.id]);

  const firstDetail = detailsToDisplay.length > 0 ? detailsToDisplay[0] : null;
  const dummyHeaderData = {
    design_id: searchDesain,
    potongan_ke: searchPotongan,
    operator: firstDetail?.production_headers?.pic || firstDetail?.production_headers?.operators?.nama_operator || "-",
    nomor_mc: firstDetail?.production_headers?.nomor_mc || "-",
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-10">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-[#0070bc]" />
          Inspeksi QC (Batch)
        </h1>
        <p className="text-sm text-slate-500">
          Pilih Desain & Potongan yang tersedia, lalu pilih Nomor PCS untuk menilai Panel-Panel sekaligus.
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
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex flex-col gap-1 w-full sm:w-1/3">
            <label className="text-xs font-bold text-slate-500 uppercase">Desain ID</label>
            <select
              value={searchDesain}
              onChange={(e) => {
                setSearchDesain(e.target.value);
                setSearchPotongan(""); // reset potongan when design changes
              }}
              disabled={isLoadingFilters}
              className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:bg-white outline-none w-full"
            >
              <option value="">-- Pilih Desain --</option>
              {uniqueDesigns.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 w-full sm:w-1/3">
            <label className="text-xs font-bold text-slate-500 uppercase">Potongan Ke</label>
            <select
              value={searchPotongan}
              onChange={(e) => setSearchPotongan(e.target.value)}
              disabled={!searchDesain}
              className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:bg-white outline-none w-full"
            >
              <option value="">-- Pilih Potongan --</option>
              {availablePotongans.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="h-11 px-6 rounded-xl bg-[#0070bc] hover:bg-[#004777] active:scale-95 disabled:opacity-50 text-white text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto shrink-0"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Cari Batch
          </button>
        </form>

        {allDetails.length > 0 && (
          <div className="mt-5 pt-5 border-t border-slate-100 flex flex-col gap-1 w-full sm:w-1/3 animate-fadeIn">
            <label className="text-xs font-bold text-slate-500 uppercase">Pilih Nomor PCS</label>
            <select
              value={selectedPcsIndex}
              onChange={(e) => {
                setSelectedPcsIndex(e.target.value);
                setSelections({});
              }}
              className="h-11 px-4 rounded-xl bg-white border border-slate-300 text-sm font-semibold focus:border-sky-500 outline-none w-full cursor-pointer text-slate-700"
            >
              <option value="">-- Pilih PCS --</option>
              {uniquePcsIndexes.map(pcs => (
                <option key={pcs} value={String(pcs)}>
                  PCS Ke-{pcs}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Details Table */}
      {selectedPcsIndex && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
          {detailsToDisplay.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <CheckCircle className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">Semua Panel di PCS ini sudah diinspeksi.</h3>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-4">Nomor Panel/Roll</th>
                      <th className="px-6 py-4">Status / Masalah</th>
                      <th className="px-6 py-4 text-center">Aksi</th>
                      <th className="px-6 py-4 text-center">Hasil Inspeksi (Pilih Grade)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {detailsToDisplay.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center justify-center min-w-[2rem] h-8 px-3 rounded-lg bg-slate-100 text-slate-700 font-bold">
                            {item.production_headers?.panel_no === "METERAN" ? `Mesin ${item.production_headers?.nomor_mc}` : `Panel ${item.production_headers?.panel_no}`}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                            {item.production_headers?.pic || item.production_headers?.operators?.nama_operator || "Anonim"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            !item.indikator_stop ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          }`}>
                            {!item.indikator_stop ? "Normal" : "Bermasalah"}
                          </div>
                          {item.kategori_masalah && (
                            <div className="text-[11px] text-rose-600 mt-1.5 font-medium max-w-xs leading-relaxed">
                              {item.kategori_masalah} - {item.detail_masalah}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => handleOpenDetail(item.header_id)}
                            className="p-2 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-[#0070bc] hover:border-[#0070bc]/30 transition-all shadow-sm group"
                            title="Lihat Detail Produksi"
                          >
                            <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleSelectGrade(item.id, 1)}
                              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all border-2 ${selections[item.id] === 1 ? 'border-sky-500 bg-sky-50 text-sky-700 scale-105' : 'border-slate-200 text-slate-500 hover:border-sky-300'}`}
                            >
                              GRADE A
                            </button>
                            <button
                              onClick={() => handleSelectGrade(item.id, 2)}
                              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all border-2 ${selections[item.id] === 2 ? 'border-amber-500 bg-amber-50 text-amber-700 scale-105' : 'border-slate-200 text-slate-500 hover:border-amber-300'}`}
                            >
                              GRADE B
                            </button>
                            <button
                              onClick={() => handleSelectGrade(item.id, 3)}
                              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all border-2 ${selections[item.id] === 3 ? 'border-rose-500 bg-rose-50 text-rose-700 scale-105' : 'border-slate-200 text-slate-500 hover:border-rose-300'}`}
                            >
                              BS
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button
                  disabled={!isAllSelected}
                  onClick={() => setIsModalOpen(true)}
                  className={`h-12 px-8 rounded-xl font-bold text-sm text-white flex items-center gap-2 transition-all duration-300 ${
                    isAllSelected 
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 active:scale-95' 
                      : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  Isi Rangkuman & Kirim Inspeksi
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {isModalOpen && (
        <QCInspectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          headerData={dummyHeaderData}
          selections={selections}
          onSuccess={async () => {
            setIsModalOpen(false);
            // Refresh logic: refetch details, reset selected pcs
            const res = await getPendingQCDetailsByBatch(searchDesain, searchPotongan);
            if (res.success && res.data) {
               setAllDetails(res.data);
               if (res.data.filter((d: any) => String(d.pcs_index) === selectedPcsIndex).length === 0) {
                 setSelectedPcsIndex(""); // clear if no more panels for this pcs
               }
            } else {
               setAllDetails([]);
            }
            setSelections({});
            
            // Also refresh available filters to update dropdowns
            const filterRes = await getAvailableQCFilters();
            if (filterRes.success && filterRes.data) {
              setAvailableFilters(filterRes.data);
            }
          }}
        />
      )}

      {/* Production Detail Modal */}
      <ProductionDetailModal 
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        detailData={detailData}
        isLoading={isDetailLoading}
        hideEdit={true}
      />
    </div>
  );
}
