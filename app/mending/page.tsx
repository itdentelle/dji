"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Loader2,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle,
  Eye,
  Scissors,
  Clock,
  HelpCircle,
} from "lucide-react";
import ProductTour, { ProductTourStep } from "@/components/ProductTour";
import MendingModal from "@/components/forms/MendingModal";
import ProductionDetailModal from "@/components/ProductionDetailModal";
import {
  getPendingMendingDetailsByBatch,
  getAvailableMendingFilters,
} from "@/actions/mending-actions";
import { getEmployeeHistoryDetail } from "@/actions/employee-actions";

const MENDING_TOUR_STEPS: ProductTourStep[] = [
  {
    target: "mending-header",
    title: "Proses Mending",
    description:
      "Mulai dari halaman ini untuk memilih batch produksi yang perlu diperbaiki oleh tim mending.",
  },
  {
    target: "mending-filter",
    title: "Pilih Batch",
    description:
      "Pilih mesin, desain, dan potongan lalu tekan Cari Batch untuk memuat antrean panel atau roll yang bermasalah.",
  },
  {
    target: "mending-pcs",
    title: "Pilih PCS",
    description:
      "Setelah batch ditemukan, pilih nomor PCS yang ingin dikerjakan dan perhatikan jam mulai mending yang tercatat otomatis.",
  },
  {
    target: "mending-details",
    title: "Beri Hasil Mending",
    description:
      "Cek detail masalah, lalu pilih Grade A, B, atau BS untuk setiap item sebelum mengirim rangkuman.",
  },
  {
    target: "mending-submit",
    title: "Kirim Inspeksi",
    description:
      "Tombol ini aktif setelah semua item pada PCS terpilih sudah diberi hasil mending.",
  },
];

export default function MendingPage() {
  const [searchMesin, setSearchMesin] = useState("");
  const [searchDesain, setSearchDesain] = useState("");
  const [searchPotongan, setSearchPotongan] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [availableFilters, setAvailableFilters] = useState<
    { nomor_mc: string; design_id: string; potongan_ke: string }[]
  >([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);

  useEffect(() => {
    const loadFilters = async () => {
      const res = await getAvailableMendingFilters();
      if (res.success && res.data) {
        setAvailableFilters(res.data);
      }
      setIsLoadingFilters(false);
    };
    loadFilters();
  }, []);

  // Menampilkan semua mesin yang tersedia secara statis
  const uniqueMesin = [
    "R1",
    "R2",
    "R3B",
    "R1C",
    "R2C",
    "R11",
    "R12",
    "R16",
    "T1C",
    "T2A",
    "Warping D6",
    "Winding",
  ];
  const availableDesigns = searchMesin
    ? Array.from(
        new Set(
          availableFilters
            .filter((f) => f.nomor_mc === searchMesin)
            .map((f) => f.design_id),
        ),
      )
    : [];
  const availablePotongans = searchDesain
    ? Array.from(
        new Set(
          availableFilters
            .filter(
              (f) => f.nomor_mc === searchMesin && f.design_id === searchDesain,
            )
            .map((f) => f.potongan_ke),
        ),
      )
    : [];

  // All pending details for the selected Design & Potongan
  const [allDetails, setAllDetails] = useState<any[]>([]);
  const [selectedPcsIndex, setSelectedPcsIndex] = useState<string>("");
  const [startMendingTime, setStartMendingTime] = useState<string>("");

  // Map of detailId -> grade string (A, B, BS)
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

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

    const res = await getPendingMendingDetailsByBatch(
      searchMesin,
      searchDesain,
      searchPotongan,
    );
    if (res.success && res.data) {
      if (res.data.length === 0) {
        setErrorMsg(
          "Tidak ada antrean Mending untuk Desain & Potongan tersebut.",
        );
      } else {
        setAllDetails(res.data);
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        setStartMendingTime(`${hh}:${mm}`);
      }
    } else {
      setErrorMsg(res.error || "Gagal mencari data.");
    }
    setIsSearching(false);
  };

  // Derive available PCS indexes from allDetails
  const uniquePcsIndexes = Array.from(
    new Set(allDetails.map((d) => d.pcs_index)),
  ).sort((a, b) => a - b);

  // Filter details by selected PCS
  const detailsToDisplay = allDetails.filter(
    (d) => String(d.pcs_index) === selectedPcsIndex,
  );

  const handleSelectGrade = (detailId: string, grade: string) => {
    setSelections((prev) => ({ ...prev, [detailId]: grade }));
  };

  // Auto-assign Grade A for Ceklis items when PCS changes
  useEffect(() => {
    if (!selectedPcsIndex) return;
    const itemsForPcs = allDetails.filter(
      (d) => String(d.pcs_index) === selectedPcsIndex,
    );
    const autoSelections: Record<string, string> = {};
    for (const d of itemsForPcs) {
      if (d.final_inspection_id === 1) {
        autoSelections[d.id] = "A"; // Ceklis → auto Grade A
      }
    }
    setSelections(autoSelections);
  }, [selectedPcsIndex, allDetails]);

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

  const isAllSelected =
    detailsToDisplay.length > 0 &&
    detailsToDisplay.every((d) => selections[d.id]);

  const firstDetail = detailsToDisplay.length > 0 ? detailsToDisplay[0] : null;
  const dummyHeaderData = {
    design_id: searchDesain,
    potongan_ke: searchPotongan,
    operator:
      firstDetail?.production_headers?.pic ||
      firstDetail?.production_headers?.operators?.nama_operator ||
      "-",
    nomor_mc: firstDetail?.production_headers?.nomor_mc || "-",
    details: detailsToDisplay,
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-10">
      <div
        data-tour="mending-header"
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Scissors className="w-6 h-6 text-rose-500" />
            Proses Mending
          </h1>
          <p className="text-sm text-slate-500">
            Pilih potongan yang tersedia, lalu berikan Grade (A, B, BS) untuk
            panel yang bermasalah.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsTourOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-bold text-[#0070bc] shadow-sm transition-all hover:bg-sky-100"
        >
          <HelpCircle className="w-4 h-4" />
          Tutorial
        </button>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Filter Card */}
      <div
        data-tour="mending-filter"
        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6"
      >
        <form
          onSubmit={handleSearch}
          className="flex flex-col sm:flex-row gap-4 items-end"
        >
          <div className="flex flex-col gap-1 w-full sm:w-1/4">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Nomor Mesin
            </label>
            <select
              value={searchMesin}
              onChange={(e) => {
                setSearchMesin(e.target.value);
                setSearchDesain("");
                setSearchPotongan("");
              }}
              disabled={isLoadingFilters}
              className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:bg-white outline-none w-full"
            >
              <option value="">-- Pilih Mesin --</option>
              {uniqueMesin.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 w-full sm:w-1/4">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Desain ID
            </label>
            <select
              value={searchDesain}
              onChange={(e) => {
                setSearchDesain(e.target.value);
                setSearchPotongan(""); // reset potongan when design changes
              }}
              disabled={!searchMesin}
              className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:bg-white outline-none w-full"
            >
              <option value="">-- Pilih Desain --</option>
              {availableDesigns.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 w-full sm:w-1/4">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Potongan Ke
            </label>
            <select
              value={searchPotongan}
              onChange={(e) => setSearchPotongan(e.target.value)}
              disabled={!searchDesain}
              className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:bg-white outline-none w-full"
            >
              <option value="">-- Pilih Potongan --</option>
              {availablePotongans.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="h-11 px-6 rounded-xl bg-[#0070bc] hover:bg-[#004777] active:scale-95 disabled:opacity-50 text-white text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto shrink-0"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Cari Batch
          </button>
        </form>

        {allDetails.length > 0 && (
          <div
            data-tour="mending-pcs"
            className="mt-5 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-end justify-between gap-4 animate-fadeIn"
          >
            <div className="flex flex-col gap-1 w-full sm:w-1/3">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Pilih Nomor PCS
              </label>
              <select
                value={selectedPcsIndex}
                onChange={(e) => {
                  setSelectedPcsIndex(e.target.value);
                }}
                className="h-11 px-4 rounded-xl bg-white border border-slate-300 text-sm font-semibold focus:border-sky-500 outline-none w-full cursor-pointer text-slate-700"
              >
                <option value="">-- Pilih PCS --</option>
                {uniquePcsIndexes.map((pcs) => (
                  <option key={pcs} value={String(pcs)}>
                    PCS Ke-{pcs}
                  </option>
                ))}
              </select>
            </div>

            {startMendingTime && (
              <div className="flex flex-col items-end w-full sm:w-auto">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Mulai Mending
                </span>
                <div className="h-11 px-6 rounded-xl bg-sky-50 border border-sky-100 text-sm font-black text-sky-700 flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto">
                  <Clock className="w-4 h-4 text-sky-500" />
                  {startMendingTime}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Details Table */}
      {selectedPcsIndex && (
        <div
          data-tour="mending-details"
          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn"
        >
          {detailsToDisplay.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <CheckCircle className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">
                Semua Panel di PCS ini sudah diinspeksi.
              </h3>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-4">Nomor Panel/Roll</th>
                      <th className="px-6 py-4">Hasil Inspeksi</th>
                      <th className="px-6 py-4">Status / Masalah</th>
                      <th className="px-6 py-4 text-center">Detail</th>
                      <th className="px-6 py-4 text-center">Hasil Mending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {detailsToDisplay.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/50 transition-colors ${item.final_inspection_id === 1 ? "bg-emerald-50/30" : ""}`}
                      >
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center justify-center min-w-[2rem] h-8 px-3 rounded-lg bg-slate-100 text-slate-700 font-bold">
                            {item.production_headers?.panel_no === "METERAN"
                              ? `Mesin ${item.production_headers?.nomor_mc}`
                              : `Panel ${item.production_headers?.panel_no}`}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                            {item.production_headers?.pic ||
                              item.production_headers?.operators
                                ?.nama_operator ||
                              "Anonim"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {item.final_inspection_id === 1 ? (
                            <div className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                              ✓ Ceklis
                            </div>
                          ) : (
                            <div className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700">
                              ✕ Silang
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              !item.indikator_stop
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
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
                              onClick={() => handleSelectGrade(item.id, "A")}
                              className={`px-4 py-2 flex items-center justify-center rounded-xl font-bold text-xs transition-all border-2 ${selections[item.id] === "A" ? "border-emerald-500 bg-emerald-50 text-emerald-700 scale-105" : "border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-500"}`}
                            >
                              Grade A
                            </button>
                            <button
                              onClick={() => handleSelectGrade(item.id, "B")}
                              className={`px-4 py-2 flex items-center justify-center rounded-xl font-bold text-xs transition-all border-2 ${selections[item.id] === "B" ? "border-amber-500 bg-amber-50 text-amber-700 scale-105" : "border-slate-200 text-slate-400 hover:border-amber-300 hover:text-amber-500"}`}
                            >
                              Grade B
                            </button>
                            <button
                              onClick={() => handleSelectGrade(item.id, "BS")}
                              className={`px-4 py-2 flex items-center justify-center rounded-xl font-bold text-xs transition-all border-2 ${selections[item.id] === "BS" ? "border-rose-500 bg-rose-50 text-rose-700 scale-105" : "border-slate-200 text-slate-400 hover:border-rose-300 hover:text-rose-500"}`}
                            >
                              Grade BS
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div
                data-tour="mending-submit"
                className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end"
              >
                <button
                  disabled={!isAllSelected}
                  onClick={() => setIsModalOpen(true)}
                  className={`h-12 px-8 rounded-xl font-bold text-sm text-white flex items-center gap-2 transition-all duration-300 ${
                    isAllSelected
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 active:scale-95"
                      : "bg-slate-300 cursor-not-allowed"
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
        <MendingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          headerData={dummyHeaderData}
          selections={selections}
          detailData={detailsToDisplay}
          startMendingTime={startMendingTime}
          onSuccess={async () => {
            setIsModalOpen(false);
            // Refresh logic
            const res = await getPendingMendingDetailsByBatch(
              searchMesin,
              searchDesain,
              searchPotongan,
            );
            if (res.success && res.data) {
              setAllDetails(res.data);
              if (
                res.data.filter(
                  (d: any) => String(d.pcs_index) === selectedPcsIndex,
                ).length === 0
              ) {
                setSelectedPcsIndex(""); // clear if no more panels for this pcs
              }
            } else {
              setAllDetails([]);
            }
            setSelections({});

            // Also refresh available filters to update dropdowns
            const filterRes = await getAvailableMendingFilters();
            if (filterRes.success && filterRes.data) {
              setAvailableFilters(filterRes.data);
            }
          }}
        />
      )}

      <ProductTour
        steps={MENDING_TOUR_STEPS}
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />

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
