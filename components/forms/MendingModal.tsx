"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, CheckCircle, AlertTriangle, Loader2, User, Clock, ClipboardList } from "lucide-react";
import { submitMending } from "@/actions/mending-actions";

const mendingSchema = z.object({
  petugas_mending: z.string().min(1, "Wajib diisi"),
  tanggal_mending: z.string().min(1, "Wajib diisi"),
  start_mending: z.string().min(1, "Wajib diisi"),
  finish_mending: z.string().min(1, "Wajib diisi"),
  
  mending_grade_a: z.number().min(0),
  mending_grade_b: z.number().min(0),
  mending_grade_bs: z.number().min(0),

  berat_kain: z.number().min(0, "Wajib diisi").optional(),
  notes: z.string().optional(),
});

type MendingFormData = z.infer<typeof mendingSchema>;

interface MendingModalProps {
  isOpen: boolean;
  onClose: () => void;
  headerData: any;
  selections: Record<string, string>; // DetailId -> Grade ("A", "B", "BS")
  detailData?: any[]; // To get berat_inspecting
  onSuccess: () => void;
  startMendingTime?: string;
}

export default function MendingModal({ isOpen, onClose, headerData, selections, detailData, onSuccess, startMendingTime }: MendingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<MendingFormData>({
    resolver: zodResolver(mendingSchema),
    defaultValues: {
      petugas_mending: "",
      tanggal_mending: new Date().toISOString().split('T')[0],
      start_mending: "",
      finish_mending: "",
      mending_grade_a: 0,
      mending_grade_b: 0,
      mending_grade_bs: 0,
      berat_kain: 0,
      notes: "",
    }
  });

  useEffect(() => {
    if (isOpen) {
      const storedPetugas = localStorage.getItem('mending_petugas');
      const storedTanggal = localStorage.getItem('mending_tanggal');

      setValue('tanggal_mending', storedTanggal || new Date().toISOString().split('T')[0]);
      if (storedPetugas) setValue('petugas_mending', storedPetugas);
      
      const storedStart = localStorage.getItem('mending_start');
      
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${hours}:${mins}`;
      
      setValue('start_mending', startMendingTime || storedStart || currentTime);
      setValue('finish_mending', currentTime);

      let countA = 0;
      let countB = 0;
      let countBS = 0;
      
      Object.values(selections).forEach(val => {
        if (val === "A") countA++;
        else if (val === "B") countB++;
        else if (val === "BS") countBS++;
      });
      
      setValue('mending_grade_a', countA);
      setValue('mending_grade_b', countB);
      setValue('mending_grade_bs', countBS);

      let initialBerat = 0;
      if (detailData && detailData.length > 0) {
        const firstDetail = detailData[0];
        if (firstDetail.qc_inspection_items && firstDetail.qc_inspection_items.length > 0) {
          initialBerat = Number(firstDetail.qc_inspection_items[0].qc_inspection_batches?.berat_kain) || 0;
        }
      }
      setValue('berat_kain', initialBerat);
    }
  }, [isOpen, setValue, selections, detailData]);

  const onSubmit = async (data: MendingFormData) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const detailsArray = Object.entries(selections).map(([detailId, grade]) => ({
        detailId,
        grade
      }));

      const res = await submitMending({
        details: detailsArray,
        petugas_mending: data.petugas_mending,
        tanggal_mending: data.tanggal_mending,
        start_mending: data.start_mending,
        finish_mending: data.finish_mending,
        mending_grade_a: data.mending_grade_a,
        mending_grade_b: data.mending_grade_b,
        mending_grade_bs: data.mending_grade_bs,
        berat_kain: data.berat_kain,
        notes: data.notes
      });

      if (!res.success) {
        throw new Error(res.error || "Gagal menyimpan data mending");
      }

      // Save to localStorage for next time
      localStorage.setItem('mending_petugas', data.petugas_mending || '');
      localStorage.setItem('mending_tanggal', data.tanggal_mending || '');
      localStorage.setItem('mending_start', data.start_mending || '');
      localStorage.setItem('mending_finish', data.finish_mending || '');

      onSuccess();
      reset();
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan yang tidak diketahui");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0070bc]/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-[#0070bc]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Rangkuman Mending</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Lengkapi form ini untuk menyelesaikan proses mending</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 text-rose-600 text-sm font-medium flex items-center gap-3 border border-rose-100">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Desain ID</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{headerData.design_id || "-"}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Potongan Ke</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{headerData.potongan_ke || "-"}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mesin</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{headerData.nomor_mc || "-"}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-emerald-50 border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Dinilai</span>
              <p className="text-xl font-black text-emerald-700 mt-0.5">{Object.keys(selections).length} PCS</p>
            </div>
          </div>

          <form id="mending-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="p-5 rounded-xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-3">
                <User className="w-4 h-4 text-[#0070bc]" />
                Petugas & Waktu
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Petugas Mending</label>
                  <select {...register("petugas_mending")} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-sky-500 outline-none">
                    <option value="">-- Pilih --</option>
                    <option value="Dede Oting">Dede Oting</option>
                    <option value="Andri">Andri</option>
                    <option value="Yudi">Yudi</option>
                  </select>
                  {errors.petugas_mending && <p className="text-red-500 text-[10px] mt-1">{errors.petugas_mending.message}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Tgl Mending</label>
                  <input type="date" {...register("tanggal_mending")} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-sky-500 outline-none" />
                  {errors.tanggal_mending && <p className="text-red-500 text-[10px] mt-1">{errors.tanggal_mending.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Waktu Mulai</label>
                  <input type="time" {...register("start_mending")} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-sky-500 outline-none" />
                  {errors.start_mending && <p className="text-red-500 text-[10px] mt-1">{errors.start_mending.message}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Waktu Selesai</label>
                  <input type="time" {...register("finish_mending")} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-sky-500 outline-none" />
                  {errors.finish_mending && <p className="text-red-500 text-[10px] mt-1">{errors.finish_mending.message}</p>}
                </div>
              </div>
              
              <div className="pt-2 border-t border-slate-100">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Berat Kain (kg)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.01"
                    {...register("berat_kain", { valueAsNumber: true })} 
                    className="w-full h-10 px-3 pr-10 rounded-xl border border-slate-200 text-sm font-semibold focus:border-sky-500 outline-none" 
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">KG</span>
                </div>
                {errors.berat_kain && <p className="text-red-500 text-[10px] mt-1">{errors.berat_kain.message}</p>}
                <p className="text-[10px] text-slate-400 mt-1">*Nilai awal diambil dari total berat inspecting QC</p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-4">
               <h3 className="text-sm font-bold flex items-center gap-2 text-emerald-800 border-b border-emerald-100 pb-3">
                 <CheckCircle className="w-4 h-4 text-emerald-600" />
                 Total Hasil Mending
               </h3>
               <div className="grid grid-cols-3 gap-4 pt-2">
                 <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Grade A</span>
                   <span className="text-2xl font-black text-slate-800">{Object.values(selections).filter(v => v === 'A').length}</span>
                 </div>
                 <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Grade B</span>
                   <span className="text-2xl font-black text-slate-800">{Object.values(selections).filter(v => v === 'B').length}</span>
                 </div>
                 <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Grade BS</span>
                   <span className="text-2xl font-black text-slate-800">{Object.values(selections).filter(v => v === 'BS').length}</span>
                 </div>
               </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Catatan / Keterangan (Opsional)</label>
              <textarea 
                {...register("notes")} 
                placeholder="Tambahkan catatan khusus jika ada..."
                className="w-full h-20 p-3 rounded-xl border border-slate-200 text-sm focus:border-sky-500 outline-none resize-none" 
              />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
          <button 
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>
          <button 
            type="submit"
            form="mending-form"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-[#0070bc] hover:bg-[#004777] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
            ) : (
              <><CheckCircle className="w-4 h-4" /> Simpan & Kirim Mending</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
