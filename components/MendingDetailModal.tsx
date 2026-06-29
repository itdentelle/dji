import React from "react";
import { X, ClipboardCheck, User, Scale, Clock, AlertTriangle, FileText, Package, Box } from "lucide-react";

interface MendingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  mendingData: any | null;
}

export default function MendingDetailModal({ isOpen, onClose, mendingData }: MendingDetailModalProps) {
  if (!isOpen || !mendingData) return null;

  const d = mendingData;
  const detail = mendingData.detail || {};
  const header = mendingData.header || {};

  let gradeColor = "text-slate-600 bg-slate-100";
  let gradeText = "Tidak Diketahui";
  
  if (detail.status_mending === 'A') {
    gradeColor = "text-emerald-700 bg-emerald-100";
    gradeText = "Grade A";
  } else if (detail.status_mending === 'B') {
    gradeColor = "text-amber-700 bg-amber-100";
    gradeText = "Grade B";
  } else if (detail.status_mending === 'BS') {
    gradeColor = "text-rose-700 bg-rose-100";
    gradeText = "Grade BS";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col my-auto animate-scaleIn overflow-hidden max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        
        {/* Header Modal */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0070bc]/10 flex items-center justify-center text-[#0070bc]">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Detail Hasil Mending</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">ID: {d.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/30">
          
          {/* Info Utama */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hasil Mending</p>
              <div className={`inline-flex px-2 py-1 rounded font-bold text-xs ${gradeColor}`}>
                {gradeText}
              </div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Panel / PCS</p>
              <p className="text-sm font-bold text-slate-800">
                {header.panel_no === "METERAN" ? "Roll " + detail.roll_no : "Panel " + header.panel_no} / PCS {detail.pcs_index}
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Desain</p>
              <p className="text-sm font-bold text-slate-800">{header.design_id || "-"}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Potongan</p>
              <p className="text-sm font-bold text-[#0070bc]">Ke-{header.potongan_ke || "-"}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-sm mb-6">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-bold text-slate-600 flex items-center gap-2">
              <Box className="w-4 h-4" /> Spesifikasi Produksi
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4">
              <div className="p-3 border-r border-b md:border-b-0 border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mesin</p>
                <p className="font-bold text-slate-800">{header.nomor_mc || "-"}</p>
              </div>
              <div className="p-3 border-r border-b md:border-b-0 border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">No. Order</p>
                <p className="font-bold text-slate-800">{header.no_order_barang || "-"}</p>
              </div>
              <div className="p-3 border-r border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pick</p>
                <p className="font-bold text-slate-800">{header.pick || "-"}</p>
              </div>
              <div className="p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tanggal Potong</p>
                <p className="font-bold text-slate-800">{header.tanggal_potong || header.tgl || "-"}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            
            {/* Info Inspeksi */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Informasi Mending
              </h4>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-sm">
                <div className="flex justify-between p-3 border-b border-slate-100">
                  <span className="text-slate-500">Petugas Mending</span>
                  <span className="font-bold text-slate-800">{d.petugas_mending || "-"}</span>
                </div>
                <div className="flex justify-between p-3 border-b border-slate-100">
                  <span className="text-slate-500">Tanggal Mending</span>
                  <span className="font-bold text-slate-800">{d.tanggal_mending || "-"}</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-slate-500">Waktu Mending</span>
                  <span className="font-bold text-slate-800">
                    {d.start_mending} s/d {d.finish_mending}
                  </span>
                </div>
              </div>
            </div>

            {/* Keterangan */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Keterangan Mending
              </h4>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-sm h-full p-4">
                <p className="text-sm text-slate-700 italic">
                  {d.hasil_mending || "Tidak ada catatan."}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
