"use client";

import React, { useState, useEffect } from "react";
import { Search, Loader2, ClipboardCheck, AlertTriangle, CheckCircle, Package, Eye, X, Plus } from "lucide-react";
import QCInspectionModal from "@/components/forms/QCInspectionModal";
import ProductionDetailModal from "@/components/ProductionDetailModal";
import { getPendingQCDetailsByBatch, getAvailableQCFilters, addQCDefectDetail } from "@/actions/qc-actions";
import { getEmployeeHistoryDetail } from "@/actions/employee-actions";

// Problem categories matching ContinuousForm
const PROBLEM_CATEGORIES = [
  { id: "A", name: "Kode A: Masalah dan Perbaikan Benang" },
  { id: "B", name: "Kode B: Perbaikan Jarum dan Element Rajutan" },
  { id: "C", name: "Kode C: Pengaturan dan Design stup" },
  { id: "D", name: "Kode D: Bahan Baku dan penggantian Benang" },
  { id: "E", name: "Kode E: Masalah Kelistrikan" },
  { id: "F", name: "Kode F: Perbaikan Mekanik (Pneumatic dan Mechanical)" },
  { id: "G", name: "Kode G: Perawatan mesin (Maintenance/Overhaul)" },
  { id: "H", name: "Kode H: Faktor Eksternal dan Non-Teknis" },
];

const PROBLEM_DETAILS: Record<string, string[]> = {
  "A": ["Perbaikan L1,L2,L3 Benang timbul putus", "Perbaikan Benang lolos", "Perbaikan Bolong corak", "Perbaikan Benang narik/Kendor", "Perbaikan Benang Nyilang", "Perbaikan/Beset benang Dasar", "Perbaikan Benang Kejepit/Jebol/kusut"],
  "B": ["Perbaikan jarum pattern patah/bengkok", "Perbaikan/Ganti Jacquard", "Perbaikan ganti jarum Compoun Nedle, pattern", "Perbaikan ngampul", "Ganti dari scaloop ke non scaloop atau sebaliknya", "Perbaikan Ngegaris/Stopline", "Perbaikan Keluar Jarum"],
  "C": ["Loading design/Ganti Design", "Perbaikan corak/revisi", "Salah ganti design", "Error design", "Proofing/PCB", "Ganti Pattern Disk", "Ganti pick"],
  "D": ["Ganti benang dasar L1/L2", "Salah ganti benang dasar", "Ganti benang Pattern Linner", "Ganti benang Pattern Heavy", "Ganti benang Pattern Shadow", "Ganti benang pattern keseluruhan (L,H,S)", "salah ganti benang pattern", "Ngelancarin", "Over Cone/Rewind", "Tunggu benang dasar dari warping", "Tunggu benang (benang belum datang)"],
  "E": ["Mati Listrik", "Perbaikan Error Servo Drive", "Perbaikan/ganti motor servo", "Sensor Benang/Laser Stop", "Perbaikan Eletrik lainnya", "Konsleting"],
  "F": ["Perbaikan cilynder Angin", "Perbaikan/ganti String bar", "Perbaikan /ganti PBO", "Perbaikan pressan As beam kendor", "Perbaikan tensi tensioner", "Perbaikan gear/Take Up Roll"],
  "G": ["Ganti Oli", "Ganti Bellow", "Ganti Vanbelt", "Ganti Black grip roll", "Pelumasan/greace pada mesin", "Perawatan Panel Listrik", "Ganti rantai/pertensi", "Servis Overhaul"],
  "H": ["Hari Libur", "Tidak ada order", "Tunggu info", "Demo", "Bencana/gempa/banjir", "Istirahat selama buka puasa", "Tunggu Sparepart"],
};

export default function QCPage() {
  const [searchMesin, setSearchMesin] = useState("");
  const [searchDesain, setSearchDesain] = useState("");
  const [searchPotongan, setSearchPotongan] = useState("");
  const [searchTanggal, setSearchTanggal] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [availableFilters, setAvailableFilters] = useState<{ nomor_mc: string; design_id: string; potongan_ke: string; tgl: string }[]>([]);
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

  const uniqueMesin = Array.from(new Set(availableFilters.map(f => f.nomor_mc))).filter(Boolean).sort();
  const availableDesigns = searchMesin 
    ? Array.from(new Set(availableFilters.filter(f => f.nomor_mc === searchMesin).map(f => f.design_id))) 
    : [];
  const availablePotongans = searchDesain 
    ? Array.from(new Set(availableFilters.filter(f => f.nomor_mc === searchMesin && f.design_id === searchDesain).map(f => f.potongan_ke))) 
    : [];
  const availableTanggals = searchPotongan 
    ? Array.from(new Set(availableFilters.filter(f => f.nomor_mc === searchMesin && f.design_id === searchDesain && String(f.potongan_ke) === searchPotongan).map(f => f.tgl))) 
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

  // Add Defect Modal State (METERAN only)
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);
  const [defectMeterKain, setDefectMeterKain] = useState("");
  const [defectKategori, setDefectKategori] = useState<string[]>([]);
  const [defectDetail, setDefectDetail] = useState("");
  const [defectKeterangan, setDefectKeterangan] = useState("");
  const [isSubmittingDefect, setIsSubmittingDefect] = useState(false);
  const [defectError, setDefectError] = useState<string | null>(null);

  // Detect if current batch is METERAN type
  const isMeteranBatch = allDetails.length > 0 && allDetails[0]?.production_headers?.panel_no === "METERAN";
  // Get the first header_id to attach new defects to
  const meteranHeaderId = allDetails.length > 0 ? allDetails[0]?.header_id : null;

  const handleDefectToggleKategori = (catId: string) => {
    setDefectKategori(prev => prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]);
  };

  const handleSubmitDefect = async () => {
    if (!defectMeterKain) {
      setDefectError("Posisi Meter Kain wajib diisi.");
      return;
    }
    if (defectKategori.length === 0) {
      setDefectError("Pilih minimal 1 Kategori Masalah.");
      return;
    }
    if (!meteranHeaderId) {
      setDefectError("Tidak ditemukan header ID untuk batch ini.");
      return;
    }
    setIsSubmittingDefect(true);
    setDefectError(null);
    try {
      const res = await addQCDefectDetail({
        headerId: meteranHeaderId,
        meterKain: defectMeterKain,
        kategoriMasalah: defectKategori,
        detailMasalah: defectDetail || undefined,
        keteranganCacat: defectKeterangan || undefined,
      });
      if (res.success) {
        // Reset form
        setDefectMeterKain("");
        setDefectKategori([]);
        setDefectDetail("");
        setDefectKeterangan("");
        setIsDefectModalOpen(false);
        // Refresh data
        const refreshRes = await getPendingQCDetailsByBatch(searchMesin, searchDesain, searchPotongan, searchTanggal);
        if (refreshRes.success && refreshRes.data) {
          setAllDetails(refreshRes.data);
        }
      } else {
        setDefectError(res.error || "Gagal menyimpan temuan cacat.");
      }
    } catch (err: any) {
      setDefectError(err.message || "Terjadi kesalahan.");
    } finally {
      setIsSubmittingDefect(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchMesin || !searchDesain || !searchPotongan) {
      setErrorMsg("Mesin, Desain, dan Potongan harus dipilih!");
      return;
    }

    setIsSearching(true);
    setErrorMsg(null);
    setAllDetails([]);
    setSelectedPcsIndex("");
    setSelections({});

    const res = await getPendingQCDetailsByBatch(searchMesin, searchDesain, searchPotongan, searchTanggal);
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
          // If no problem and not already selected, auto-select Ceklis (1)
          if (!hasProblem && !newSelections[d.id]) {
            newSelections[d.id] = 1; 
            hasChanges = true;
          }
          // If has problem and not already selected, auto-select Silang (3)
          if (hasProblem && !newSelections[d.id]) {
            newSelections[d.id] = 3;
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
    details: detailsToDisplay,
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
          <div className="flex flex-col gap-1 w-full sm:flex-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Nomor Mesin</label>
            <select
              value={searchMesin}
              onChange={(e) => {
                setSearchMesin(e.target.value);
                setSearchDesain("");
                setSearchPotongan("");
                setSearchTanggal("");
              }}
              disabled={isLoadingFilters}
              className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:bg-white outline-none w-full"
            >
              <option value="">-- Pilih Mesin --</option>
              {uniqueMesin.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 w-full sm:flex-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Desain ID</label>
            <select
              value={searchDesain}
              onChange={(e) => {
                setSearchDesain(e.target.value);
                setSearchPotongan("");
                setSearchTanggal("");
              }}
              disabled={!searchMesin}
              className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:bg-white outline-none w-full"
            >
              <option value="">-- Pilih Desain --</option>
              {availableDesigns.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 w-full sm:flex-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Potongan Ke</label>
            <select
              value={searchPotongan}
              onChange={(e) => {
                setSearchPotongan(e.target.value);
                setSearchTanggal("");
              }}
              disabled={!searchDesain}
              className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:bg-white outline-none w-full"
            >
              <option value="">-- Pilih Potongan --</option>
              {availablePotongans.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 w-full sm:flex-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Tanggal</label>
            <select
              value={searchTanggal}
              onChange={(e) => setSearchTanggal(e.target.value)}
              disabled={!searchPotongan}
              className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:bg-white outline-none w-full"
            >
              <option value="">-- Semua Tanggal --</option>
              {availableTanggals.map(t => (
                <option key={t} value={t}>{t}</option>
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

      {/* Add Defect Button for METERAN */}
      {isMeteranBatch && allDetails.length > 0 && (
        <div className="mb-4 flex justify-end animate-fadeIn">
          <button
            onClick={() => setIsDefectModalOpen(true)}
            className="h-11 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-sm font-bold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-rose-600/20"
          >
            <Plus className="w-4 h-4" />
            Tambah Temuan Cacat Baru
          </button>
        </div>
      )}

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
                      <th className="px-6 py-4 text-center">Detail</th>
                      <th className="px-6 py-4 text-center">Hasil Inspeksi (Ceklis/Silang)</th>
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
                              className={`p-2 flex items-center justify-center rounded-xl transition-all border-2 ${selections[item.id] === 1 ? 'border-emerald-500 bg-emerald-50 text-emerald-700 scale-105' : 'border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-500'}`}
                              title="Ceklis"
                            >
                              <CheckCircle className="w-5 h-5"/>
                            </button>
                            <button
                              onClick={() => handleSelectGrade(item.id, 3)}
                              className={`p-2 flex items-center justify-center rounded-xl transition-all border-2 ${selections[item.id] === 3 ? 'border-rose-500 bg-rose-50 text-rose-700 scale-105' : 'border-slate-200 text-slate-400 hover:border-rose-300 hover:text-rose-500'}`}
                              title="Silang"
                            >
                              <X className="w-5 h-5"/>
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
            const res = await getPendingQCDetailsByBatch(searchMesin, searchDesain, searchPotongan);
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

      {/* Add Defect Modal (METERAN) */}
      {isDefectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-rose-500" />
                  Tambah Temuan Cacat Baru
                </h2>
                <p className="text-xs text-slate-500 mt-1">Catat temuan cacat baru yang ditemukan saat inspeksi kain meteran.</p>
              </div>
              <button onClick={() => { setIsDefectModalOpen(false); setDefectError(null); }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-5">
              {defectError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {defectError}
                </div>
              )}

              {/* Posisi Meter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Posisi Meter Kain <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  step="any"
                  value={defectMeterKain}
                  onChange={(e) => setDefectMeterKain(e.target.value)}
                  className="h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-base font-semibold focus:bg-white focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
                  placeholder="Contoh: 75"
                />
              </div>

              {/* Kategori Masalah */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-rose-600 uppercase">Kategori Masalah <span className="text-rose-500">*</span> (Pilih 1 atau lebih)</label>
                <div className="grid grid-cols-1 gap-2 mt-1">
                  {PROBLEM_CATEGORIES.map(c => (
                    <label key={c.id} className={`flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer transition-all ${
                      defectKategori.includes(c.id) 
                        ? 'border-rose-400 bg-rose-50 ring-1 ring-rose-200' 
                        : 'border-slate-200 bg-white hover:border-rose-300'
                    }`}>
                      <input
                        type="checkbox"
                        checked={defectKategori.includes(c.id)}
                        onChange={() => handleDefectToggleKategori(c.id)}
                        className="w-4 h-4 text-rose-600 rounded border-rose-300 focus:ring-rose-500"
                      />
                      <span className="text-[11px] font-bold text-slate-700">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Detail Masalah Dropdown */}
              {defectKategori.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Detail Masalah</label>
                  <select
                    value={defectDetail}
                    onChange={(e) => setDefectDetail(e.target.value)}
                    className="h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:border-rose-400 focus:bg-white outline-none transition-all"
                  >
                    <option value="">-- Pilih Detail --</option>
                    {defectKategori.flatMap(catId => (PROBLEM_DETAILS[catId] || []).map(p => (
                      <option key={`${catId}-${p}`} value={p}>{p}</option>
                    )))}
                  </select>
                </div>
              )}

              {/* Keterangan Tambahan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Keterangan Tambahan</label>
                <textarea
                  value={defectKeterangan}
                  onChange={(e) => setDefectKeterangan(e.target.value)}
                  rows={3}
                  className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:bg-white focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all resize-none"
                  placeholder="Tuliskan keterangan tambahan jika ada..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => { setIsDefectModalOpen(false); setDefectError(null); }}
                className="h-11 px-5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button
                disabled={isSubmittingDefect}
                onClick={handleSubmitDefect}
                className="h-11 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 text-white text-sm font-bold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-rose-600/20"
              >
                {isSubmittingDefect ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Simpan Temuan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
