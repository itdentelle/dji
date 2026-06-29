import React from "react";
import { X, Save, Settings2, Trash2 } from "lucide-react";
import { UseFormRegister, FieldErrors, UseFormWatch } from "react-hook-form";
import { ProductionFormInput } from "@/lib/schemas";

interface ProductionHeaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  watch: UseFormWatch<any>;
  groups: any[];
  operators: any[];
  activeShiftName: string;
  onClearHeader: () => void;
}

export default function ProductionHeaderModal({
  isOpen,
  onClose,
  register,
  errors,
  watch,
  groups,
  operators,
  activeShiftName,
  onClearHeader
}: ProductionHeaderModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">Konfigurasi Header Produksi</h2>
              <p className="text-xs font-semibold text-slate-500">Konfigurasi ini akan berlaku untuk semua panel/roll yang Anda input.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClearHeader} className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors">
              <Trash2 className="w-3 h-3" />
              Reset Header
            </button>
            <button onClick={onClose} type="button" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Modal (Form) */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {/* Operator & Grup */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Nama Operator (Shift {activeShiftName}) *</label>
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-white custom-scrollbar shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 px-1">
                  {operators.length > 0 ? (
                    operators.map((op: any) => (
                      <label key={op.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-sky-50 p-2 rounded-md transition-colors border border-transparent hover:border-sky-100">
                        <input type="radio" value={op.id.toString()} {...register("operatorId")} className="w-4 h-4 text-sky-500 border-slate-300 focus:ring-sky-400" />
                        <span className="truncate">{op.name}</span>
                      </label>
                    ))
                  ) : (
                    <div className="col-span-full text-xs text-slate-400 italic py-2 text-center">Tidak ada operator di shift ini</div>
                  )}
                </div>
              </div>
              {errors.operatorId && <span className="text-red-500 text-[10px] font-bold">{errors.operatorId.message as string}</span>}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Grup Shift *</label>
              <select {...register("groupId")} className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none shadow-sm transition-all">
                {groups.map(g => <option key={g.id} value={g.id.toString()}>Grup {g.name}</option>)}
              </select>
              {errors.groupId && <span className="text-red-500 text-[10px] font-bold">{errors.groupId.message as string}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            {/* Kolom Kiri */}
            <div className="space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">Status Matching *</label>
                <select {...register("statusMatching")} className="h-11 px-4 rounded-xl bg-sky-50 border border-sky-200 text-sm focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20 outline-none font-bold text-sky-900 transition-all">
                  <option value="">-- Wajib Pilih --</option>
                  <option value="OK">OK</option>
                  <option value="Tidak OK">Tidak OK</option>
                </select>
                {errors.statusMatching && <span className="text-red-500 text-[10px] font-bold">{errors.statusMatching.message as string}</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Design *</label>
                <input type="text" {...register("designId")} placeholder="Ketik nama design..." className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none shadow-sm transition-all" />
                {errors.designId && <span className="text-red-500 text-[10px] font-bold">{errors.designId.message as string}</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Nomor Mesin</label>
                <select {...register("nomorMc")} className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none shadow-sm transition-all">
                  <option value="">-- Pilih --</option>
                  {["R1", "R2", "R3B", "R1C", "R2C", "R11", "R12", "R16", "T1C", "T2A", "Warping D6", "Winding"].map(mc => (
                    <option key={mc} value={mc}>{mc}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tanggal Produksi</label>
                  <input type="date" {...register("tanggalProduksi")} className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none shadow-sm transition-all" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">RPM</label>
                  <input type="text" {...register("rpm")} className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none shadow-sm transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Pick</label>
                  <input type="text" {...register("pick")} className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none shadow-sm transition-all" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Course</label>
                  <input type="text" {...register("course")} className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none shadow-sm transition-all" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">No. Order Barang</label>
                <input type="text" {...register("noOrderBarang")} placeholder="EXT/..." className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none shadow-sm transition-all" />
              </div>
            </div>

            {/* Kolom Kanan */}
            <div className="space-y-5">
              <div className="flex flex-col gap-1.5 p-4 bg-sky-50/50 rounded-xl border border-sky-100">
                <label className="text-[10px] font-black text-sky-700 uppercase tracking-wider">Potongan Ke *</label>
                <input type="text" {...register("potonganKe")} className="h-11 px-4 rounded-xl bg-white border border-sky-300 text-sm font-black text-sky-900 focus:border-sky-500 focus:ring-4 focus:ring-sky-400/20 outline-none shadow-sm transition-all placeholder:font-medium" placeholder="Misal: 288 (Wajib diisi)" />
                {errors.potonganKe && <span className="text-red-500 text-[10px] font-bold mt-1">{errors.potonganKe.message as string}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Jenis benang dasar</label>
                <input type="text" {...register("jenisBenangDasar")} className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none shadow-sm transition-all" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Liner</label>
                <input type="text" {...register("liner")} className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none shadow-sm transition-all" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Heavy</label>
                <input type="text" {...register("heavy")} className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none shadow-sm transition-all" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Shadow</label>
                <input type="text" {...register("shadow")} className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none shadow-sm transition-all" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Pinggiran</label>
                <input type="text" {...register("pinggiran")} className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none shadow-sm transition-all" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">No. Customer</label>
                <input type="text" {...register("noCustomer")} placeholder="Customer..." className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none shadow-sm transition-all" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-[#0070bc] hover:bg-[#005a96] text-white font-bold text-sm rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Simpan Konfigurasi
          </button>
        </div>
      </div>
    </div>
  );
}
