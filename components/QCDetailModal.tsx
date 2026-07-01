import React from "react";
import { X, ClipboardCheck, User, Scale, Clock, AlertTriangle, FileText, Package, Box, CheckCircle2, XCircle } from "lucide-react";

interface QCDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  qcData: any | null;
}

export default function QCDetailModal({ isOpen, onClose, qcData }: QCDetailModalProps) {
  if (!isOpen || !qcData) return null;

  const group = qcData;
  const header = group.header || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col my-auto animate-scaleIn overflow-hidden max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        
        {/* Header Modal */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0070bc]/10 flex items-center justify-center text-[#0070bc]">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Detail Hasil QC Inspeksi Batch</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Desain: {header.design_id || "-"} / Potongan: {header.potongan_ke || "-"}</p>
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
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hasil Inspeksi Batch</p>
              <div className="text-sm font-bold text-slate-800 flex items-center gap-3 mt-1">
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
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nomor PCS</p>
              <p className="text-sm font-bold text-slate-800">PCS Ke-{group.pcs_index}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Panel</p>
              <p className="text-sm font-bold text-slate-800">{group.items?.length || 0} Panel</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mesin</p>
              <p className="text-sm font-bold text-slate-800">{header.nomor_mc || "-"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Info Inspeksi */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Informasi Inspeksi
              </h4>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-sm">
                <div className="flex justify-between p-3 border-b border-slate-100">
                  <span className="text-slate-500">Petugas Inspeksi 1</span>
                  <span className="font-bold text-slate-800">{group.petugas_inspeksi || "-"}</span>
                </div>
                <div className="flex justify-between p-3 border-b border-slate-100">
                  <span className="text-slate-500">Petugas Inspeksi 2</span>
                  <span className="font-bold text-slate-800">{group.petugas_inspeksi_2 || "-"}</span>
                </div>
                <div className="flex justify-between p-3 border-b border-slate-100">
                  <span className="text-slate-500">Tanggal Inspeksi</span>
                  <span className="font-bold text-slate-800">{group.tanggal_inspeksi || "-"}</span>
                </div>
                <div className="flex justify-between p-3 border-b border-slate-100">
                  <span className="text-slate-500">Waktu Inspeksi</span>
                  <span className="font-bold text-slate-800">
                    {group.start_inspect} s/d {group.finish_inspect}
                  </span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-slate-500">Berat Kain (Kg)</span>
                  <span className="font-bold text-[#0070bc]">{group.berat_produksi} Kg</span>
                </div>
              </div>
            </div>

            {/* Total Grade */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" /> Rekapitulasi Hasil Batch (PCS Ini)
              </h4>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <div className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">OK / GRADE A</div>
                    <div className="text-xl font-black text-emerald-600">{group.inspeksi_ceklis} Panel</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <div className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">SILANG / REJECT</div>
                    <div className="text-xl font-black text-rose-600">{group.inspeksi_silang} Panel</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* List of Panels */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Box className="w-4 h-4" /> Rincian Panel di PCS Ini
            </h4>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Panel / Roll</th>
                      <th className="px-4 py-3 text-center">Hasil QC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(group.items || []).map((item: any, idx: number) => {
                      const detail = item.detail || {};
                      const itemHeader = item.header || header;
                      let itemText = "-";
                      let Icon = null;
                      let iconColor = "";

                      if (detail.final_inspection_id === 1) {
                        itemText = "OK (Ceklis)";
                        Icon = CheckCircle2;
                        iconColor = "text-emerald-500";
                      } else if (detail.final_inspection_id === 2 || detail.final_inspection_id === 3) {
                        itemText = "Silang";
                        Icon = XCircle;
                        iconColor = "text-rose-500";
                      }

                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-slate-800">
                            {itemHeader.panel_no === "METERAN" ? "Roll " + detail.roll_no : "Panel " + itemHeader.panel_no}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1.5">
                              {Icon && <Icon className={`w-4 h-4 ${iconColor}`} />}
                              {itemText}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
