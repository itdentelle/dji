"use client";

import React, { useState, useEffect, useRef } from "react";
import { getBatchesForBarcode } from "@/actions/barcode-actions";
import {
  Search,
  Loader2,
  QrCode,
  Filter,
  RefreshCw,
  Hash,
  FileText,
  CheckCircle,
  Package,
  AlertTriangle,
  X,
  Download,
  HelpCircle,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import ProductTour, { ProductTourStep } from "@/components/ProductTour";

const QC_BARCODE_TOUR_STEPS: ProductTourStep[] = [
  {
    target: "qc-barcode-header",
    title: "Cetak Barcode QC",
    description:
      "Halaman ini dipakai untuk membuat barcode/QR hasil akhir QC dan mending per batch.",
  },
  {
    target: "qc-barcode-filter",
    title: "Filter Batch",
    description:
      "Saring batch berdasarkan mesin, design, atau potongan agar batch yang dicari lebih cepat ditemukan.",
  },
  {
    target: "qc-barcode-results",
    title: "Daftar Batch",
    description:
      "Pilih batch hasil mending yang akan dibuat barcode. Klik Generate Barcode untuk membuka preview.",
  },
  {
    target: "qc-barcode-results",
    title: "Cetak atau Unduh",
    description:
      "Di modal barcode, pilih grade final lalu cetak atau unduh gambar barcode.",
  },
];

export default function BarcodePage() {
  const [filters, setFilters] = useState<{
    nomor_mc: string;
    design_id: string;
    potongan_ke: string;
  }>({
    nomor_mc: "",
    design_id: "",
    potongan_ke: "",
  });

  const [allData, setAllData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Print Modal State
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gradeInput, setGradeInput] = useState<string>("A");
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Auto-load all mended batches on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const res = await getBatchesForBarcode({});
        if (res.success && res.data) {
          setAllData(res.data);
        } else {
          setErrorMsg(res.error || "Gagal mengambil data batch.");
        }
      } catch (err: any) {
        setErrorMsg("Terjadi kesalahan jaringan.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const uniqueMesin = Array.from(
    new Set(allData.map((d) => d.nomor_mc).filter(Boolean)),
  ).sort();
  const uniqueDesign = Array.from(
    new Set(allData.map((d) => d.design_id).filter(Boolean)),
  ).sort();
  const uniquePotongan = Array.from(
    new Set(allData.map((d) => String(d.potongan_ke)).filter(Boolean)),
  ).sort((a, b) => Number(a) - Number(b));

  // Client-side filtering
  const filteredData = allData.filter((batch) => {
    if (filters.nomor_mc && batch.nomor_mc !== filters.nomor_mc) return false;
    if (filters.design_id && batch.design_id !== filters.design_id)
      return false;
    if (
      filters.potongan_ke &&
      String(batch.potongan_ke) !== filters.potongan_ke
    )
      return false;
    return true;
  });

  const handleOpenPrint = (batch: any) => {
    setSelectedBatch(batch);
    setGradeInput("A");
    setIsModalOpen(true);
  };

  const getQRDataString = (batch: any, grade: string) => {
    const obj = {
      kode_design: batch.design_id || "-",
      nomor_mesin: batch.nomor_mc || "-",
      potongan_ke: batch.potongan_ke || "-",
      berat_kain: batch.berat_kain ? `${batch.berat_kain} kg` : "0 kg",
      jumlah_panel: batch.jumlah_panel || 1,
      pcs_ke: batch.pcs_index || "-",
      no_order: batch.no_order_barang || "-",
      grade: grade,
      no_customer: batch.no_customer || "-",
      tanggal: batch.tgl || "-",
    };
    return JSON.stringify(obj, null, 2);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const node = document.getElementById("print-area");
    if (!node) return;

    try {
      const dataUrl = await toPng(node, {
        quality: 1,
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `Barcode_MC${selectedBatch?.nomor_mc}_${selectedBatch?.design_id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Gagal mendownload barcode", err);
    }
  };

  return (
    <div className="w-full h-full pb-20 animate-fadeIn">
      <div className="max-w-6xl mx-auto print:hidden">
        {/* Header */}
        <div
          data-tour="qc-barcode-header"
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <QrCode className="w-7 h-7 text-[#0070bc]" />
              Cetak Barcode QC
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Cetak barcode hasil akhir inspeksi dan mending per batch.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsTourOpen(true)}
            className="h-11 px-4 rounded-full bg-[#0070bc] hover:bg-[#004777] text-white text-xs font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2 self-start md:self-auto"
          >
            <HelpCircle className="w-4 h-4" /> Tutorial
          </button>
        </div>

        {/* Filter Card */}
        <div
          data-tour="qc-barcode-filter"
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 relative z-10"
        >
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex flex-col gap-1 w-full sm:w-1/3">
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                Nomor Mesin
              </label>
              <select
                value={filters.nomor_mc}
                onChange={(e) =>
                  setFilters({ ...filters, nomor_mc: e.target.value })
                }
                className="h-11 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:border-sky-400 focus:bg-white outline-none w-full font-semibold"
              >
                <option value="">Semua Mesin</option>
                {uniqueMesin.map((m: any) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 w-full sm:w-1/3">
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                Design ID
              </label>
              <select
                value={filters.design_id}
                onChange={(e) =>
                  setFilters({ ...filters, design_id: e.target.value })
                }
                className="h-11 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:border-sky-400 focus:bg-white outline-none w-full font-semibold"
              >
                <option value="">Semua Design</option>
                {uniqueDesign.map((d: any) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 w-full sm:w-1/3">
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                Potongan Ke
              </label>
              <select
                value={filters.potongan_ke}
                onChange={(e) =>
                  setFilters({ ...filters, potongan_ke: e.target.value })
                }
                className="h-11 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:border-sky-400 focus:bg-white outline-none w-full font-semibold"
              >
                <option value="">Semua Potongan</option>
                {uniquePotongan.map((p: any) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {(filters.nomor_mc || filters.design_id || filters.potongan_ke) && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Menampilkan {filteredData.length} dari {allData.length} batch
              </span>
              <button
                onClick={() =>
                  setFilters({ nomor_mc: "", design_id: "", potongan_ke: "" })
                }
                className="text-xs text-[#0070bc] font-bold hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Reset Filter
              </button>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 text-rose-600 text-sm font-bold flex items-center gap-3 border border-rose-100 animate-fadeIn">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Results */}
        <div data-tour="qc-barcode-results" className="space-y-4 relative z-0">
          {isLoading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center text-center animate-fadeIn">
              <Loader2 className="w-10 h-10 text-[#0070bc] animate-spin mb-4" />
              <h3 className="text-lg font-bold text-slate-700 mb-1">
                Memuat Data...
              </h3>
              <p className="text-sm text-slate-500">
                Mengambil batch yang sudah di-mending
              </p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center text-center animate-fadeIn">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Package className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">
                {allData.length === 0
                  ? "Belum Ada Data Mending"
                  : "Tidak Ditemukan"}
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                {allData.length === 0
                  ? "Belum ada batch yang sudah selesai proses mending."
                  : "Coba ubah filter pencarian Anda."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredData.map((batch, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all group flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-extrabold uppercase border border-slate-200">
                        MC {batch.nomor_mc}
                      </span>
                      <span className="px-2 py-1 rounded-md bg-[#0070bc]/10 text-[#0070bc] text-[10px] font-extrabold uppercase border border-[#0070bc]/20">
                        POT {batch.potongan_ke}
                      </span>
                      <span className="px-2 py-1 rounded-md bg-purple-100 text-purple-700 text-[10px] font-extrabold uppercase border border-purple-200">
                        PCS {batch.pcs_index}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      {batch.tgl}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-800 mb-4">
                    {batch.design_id || "-"}
                  </h3>

                  <div className="grid grid-cols-2 gap-3 mb-5 flex-1">
                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">
                        Panel Ke
                      </span>
                      <span className="block text-sm font-black text-slate-700">
                        PCS {batch.pcs_index}
                      </span>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">
                        Berat Kain
                      </span>
                      <span className="block text-sm font-black text-slate-700">
                        {batch.berat_kain} Kg
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenPrint(batch)}
                    className="w-full h-10 bg-slate-100 hover:bg-[#0070bc] text-slate-600 hover:text-white rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 group-hover:border-[#0070bc]"
                  >
                    <QrCode className="w-4 h-4" />
                    Generate Barcode
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <ProductTour
          steps={QC_BARCODE_TOUR_STEPS}
          isOpen={isTourOpen}
          onClose={() => setIsTourOpen(false)}
        />

        {/* Print Barcode Modal */}
        {isModalOpen && selectedBatch && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:p-0 print:items-start print:bg-white">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden"
              onClick={() => setIsModalOpen(false)}
            />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 max-h-[90vh] print:shadow-none print:w-full print:max-w-none print:h-screen print:max-h-none print:rounded-none">
              {/* Modal Header - Hidden during print */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 print:hidden">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0070bc]/10 flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-[#0070bc]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">
                      Cetak Barcode
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Generate QR Code Informasi QC
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto print:p-0 print:overflow-visible">
                {/* Form Input Grade - Hidden during print */}
                <div className="mb-6 pb-6 border-b border-slate-100 print:hidden">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    Masukkan Grade Final
                  </label>
                  <select
                    value={gradeInput}
                    onChange={(e) => setGradeInput(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 text-sm font-bold focus:border-[#0070bc] focus:ring-4 focus:ring-[#0070bc]/10 outline-none text-slate-700 bg-slate-50 focus:bg-white transition-all"
                  >
                    <option value="A">Grade A</option>
                    <option value="B">Grade B</option>
                    <option value="C">Grade C</option>
                    <option value="D">Grade D</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-2">
                    Grade ini akan dimasukkan ke dalam data QR Code.
                  </p>
                </div>

                {/* Printable Area */}
                <div
                  id="print-area"
                  className="flex flex-col items-center justify-center p-4 bg-white"
                >
                  <div className="border-4 border-slate-900 p-6 rounded-3xl flex flex-col items-center gap-4 bg-white shadow-sm print:shadow-none print:border-black print:rounded-none">
                    <div className="text-center mb-2">
                      <h3 className="font-black text-2xl text-slate-900 tracking-tight">
                        DJI - QC PASS
                      </h3>
                      <p className="text-sm font-bold text-slate-600">
                        GRADE {gradeInput}
                      </p>
                    </div>

                    <div className="bg-white p-2 border-2 border-slate-100 rounded-xl print:border-none">
                      <QRCodeSVG
                        value={getQRDataString(selectedBatch, gradeInput)}
                        size={180}
                        level="Q"
                        includeMargin={false}
                      />
                    </div>

                    <div className="w-full mt-4 space-y-1.5 border-t-2 border-dashed border-slate-200 pt-4">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>Desain:</span>
                        <span className="font-bold text-slate-900">
                          {selectedBatch.design_id}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>No Customer:</span>
                        <span className="font-bold text-slate-900">
                          {selectedBatch.no_customer || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>Mesin/Pot:</span>
                        <span className="font-bold text-slate-900">
                          {selectedBatch.nomor_mc} / {selectedBatch.potongan_ke}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>Tanggal:</span>
                        <span className="font-bold text-slate-900">
                          {selectedBatch.tgl || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>Berat:</span>
                        <span className="font-bold text-slate-900">
                          {selectedBatch.berat_kain} Kg
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>PCS Ke:</span>
                        <span className="font-bold text-slate-900">
                          {selectedBatch.pcs_index}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer - Hidden during print */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50 print:hidden">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-sm font-bold transition-all duration-200 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Unduh Gambar
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-6 py-2.5 rounded-xl bg-[#0070bc] hover:bg-[#004777] active:scale-95 text-white text-sm font-bold transition-all duration-200 shadow-sm flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Cetak
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global CSS for Print */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
        @media print {
          body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            margin: 0;
            size: auto;
          }
          #print-area {
            width: 100% !important;
            height: 100vh !important;
            display: flex !important;
            flex-direction: column;
            align-items: center !important;
            justify-content: flex-start !important;
            padding-top: 2rem !important;
          }
        }
      `,
          }}
        />
      </div>
    </div>
  );
}
