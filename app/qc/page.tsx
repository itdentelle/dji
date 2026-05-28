"use client";

import React, { useState, useEffect } from "react";
import { getPendingInspections } from "@/actions/qc-actions";
import QCInspectionModal from "@/components/forms/QCInspectionModal";
import { Loader2, AlertCircle, ClipboardCheck, Search, Filter } from "lucide-react";

export default function QCPage() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [selectedProduction, setSelectedProduction] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchInspections = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await getPendingInspections();
      if (result.success) {
        setInspections(result.data || []);
      } else {
        setErrorMsg(result.error || "Gagal memuat data antrean inspeksi");
      }
    } catch (err: any) {
      setErrorMsg("Terjadi kesalahan jaringan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  const handleOpenModal = (prod: any) => {
    setSelectedProduction(prod);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    // Refresh table after success
    fetchInspections();
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-[#0070bc]" />
            Antrean Inspeksi Final (QC)
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Tinjau hasil produksi dari mesin dan tentukan Grade akhir produk.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Cari desain/operator..." 
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm w-full md:w-64 focus:outline-none focus:border-[#0070bc] transition-colors"
            />
          </div>
          <button className="p-2 border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#0070bc]" />
            <p className="font-semibold text-sm">Memuat antrean inspeksi...</p>
          </div>
        ) : errorMsg ? (
          <div className="flex items-center gap-3 p-10 justify-center text-red-500">
            <AlertCircle className="w-6 h-6" />
            <p className="font-semibold">{errorMsg}</p>
          </div>
        ) : inspections.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-slate-400">
            <div className="w-16 h-16 rounded-full bg-sky-50 flex items-center justify-center mb-4">
              <ClipboardCheck className="w-8 h-8 text-sky-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Semua Bersih!</h3>
            <p className="text-sm font-medium">Tidak ada barang yang menunggu untuk diinspeksi saat ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider">
                  <th className="p-4 font-bold">Waktu Produksi</th>
                  <th className="p-4 font-bold">Operator & Mesin</th>
                  <th className="p-4 font-bold">Desain (Panel)</th>
                  <th className="p-4 font-bold text-center">Jml (Pcs)</th>
                  <th className="p-4 font-bold">Status Awal (Loper)</th>
                  <th className="p-4 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {inspections.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">
                        {new Date(item.tanggal_jam).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {new Date(item.tanggal_jam).toLocaleDateString("id-ID")}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-[#0070bc]">
                        {item.operators?.nama_operator || "Anonim"}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400">
                        Grup {item.groups?.nama_grup || "-"}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{item.designs?.nama_design || "Tanpa Desain"}</div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Ptgn: {item.potongan_ke || '-'} | Panel: {item.panel_no || '-'}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-lg bg-slate-100 text-slate-700 font-bold">
                        {item.jml_hasil_produksi || 0}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        item.status_inspeksi 
                          ? "bg-sky-100 text-sky-700" 
                          : "bg-rose-100 text-rose-700"
                      }`}>
                        {item.status_inspeksi ? "Lolos QC Awal" : "Recheck (BS)"}
                      </div>
                      {item.keterangan && (
                        <div className="text-[10px] text-slate-500 mt-1 max-w-[150px] truncate" title={item.keterangan}>
                          {item.keterangan}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleOpenModal(item)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0070bc] text-white text-xs font-bold rounded-xl hover:bg-[#004777] transition-colors shadow-md shadow-[#0070bc]/20"
                      >
                        Inspeksi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <QCInspectionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        production={selectedProduction}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
