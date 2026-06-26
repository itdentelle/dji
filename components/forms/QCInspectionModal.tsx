"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, CheckCircle, AlertTriangle, Loader2, User, Scale, Clock, ClipboardList } from "lucide-react";
import { submitQCInspection } from "@/actions/qc-actions";

const qcSchema = z.object({
  petugas_inspeksi: z.string().min(1, "Wajib diisi"),
  petugas_inspeksi_2: z.string().optional(),
  tanggal_inspeksi: z.string().min(1, "Wajib diisi"),
  start_inspect: z.string().min(1, "Wajib diisi"),
  finish_inspect: z.string().min(1, "Wajib diisi"),
  berat_produksi: z.number().min(0, "Wajib diisi"),
  berat_inspecting: z.number().min(0, "Wajib diisi"),
  hasil_matching: z.string().min(1, "Wajib diisi"),
  
  petugas_mending: z.string().optional(),
  tanggal_mending: z.string().optional(),
  start_mending: z.string().optional(),
  finish_mending: z.string().optional(),
  
  prod_grade_a: z.number().min(0),
  prod_grade_b: z.number().min(0),
  prod_bs: z.number().min(0),
  
  qc_grade_a: z.number().min(0),
  qc_grade_b: z.number().min(0),
  qc_bs: z.number().min(0),

  notes: z.string().optional(),
  tanggal_potong: z.string().optional(),
});

type QCFormData = z.infer<typeof qcSchema>;

interface QCInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  headerData: any;
  selections: Record<string, number>;
  onSuccess: () => void;
}

export default function QCInspectionModal({ isOpen, onClose, headerData, selections, onSuccess }: QCInspectionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<QCFormData>({
    resolver: zodResolver(qcSchema),
    defaultValues: {
      petugas_inspeksi: "",
      petugas_inspeksi_2: "",
      tanggal_inspeksi: new Date().toISOString().split('T')[0],
      start_inspect: "",
      finish_inspect: "",
      berat_produksi: 0,
      berat_inspecting: 0,
      hasil_matching: "",
      petugas_mending: "",
      tanggal_mending: "",
      start_mending: "",
      finish_mending: "",
      prod_grade_a: 0,
      prod_grade_b: 0,
      prod_bs: 0,
      qc_grade_a: 0,
      qc_grade_b: 0,
      qc_bs: 0,
      notes: "",
      tanggal_potong: "",
    }
  });

  useEffect(() => {
    if (isOpen) {
      // Set current date when modal opens
      setValue('tanggal_inspeksi', new Date().toISOString().split('T')[0]);
      
      // Calculate start time automatically as current time
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setValue('start_inspect', `${hours}:${mins}`);

      // Count selections to auto-fill QC grades
      let countA = 0;
      let countB = 0;
      let countBS = 0;
      Object.values(selections).forEach(val => {
        if (val === 1) countA++;
        else if (val === 2) countB++;
        else if (val === 3) countBS++;
      });
      setValue('qc_grade_a', countA);
      setValue('qc_grade_b', countB);
      setValue('qc_bs', countBS);
    }
  }, [isOpen, setValue, selections]);

  if (!isOpen || !headerData) return null;

  const handleClose = () => {
    reset();
    setErrorMsg(null);
    onClose();
  };

  const onSubmit = async (data: QCFormData) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const detailsArray = Object.keys(selections).map(detailId => ({
        detailId,
        finalInspectionId: selections[detailId]
      }));

      const payload = {
        details: detailsArray,
        petugas_inspeksi: data.petugas_inspeksi,
        petugas_inspeksi_2: data.petugas_inspeksi_2 || undefined,
        tanggal_inspeksi: data.tanggal_inspeksi,
        start_inspect: data.start_inspect,
        finish_inspect: data.finish_inspect,
        berat_produksi: data.berat_produksi,
        berat_inspecting: data.berat_inspecting,
        hasil_matching: data.hasil_matching,
        petugas_mending: data.petugas_mending || undefined,
        tanggal_mending: data.tanggal_mending || undefined,
        start_mending: data.start_mending || undefined,
        finish_mending: data.finish_mending || undefined,
        prod_grade_a: data.prod_grade_a,
        prod_grade_b: data.prod_grade_b,
        prod_bs: data.prod_bs,
        qc_grade_a: data.qc_grade_a,
        qc_grade_b: data.qc_grade_b,
        qc_bs: data.qc_bs,
        notes: data.notes,
        tanggal_potong: data.tanggal_potong
      };

      if (!navigator.onLine) {
        const { addPendingPayload } = await import("@/lib/offline-store");
        await addPendingPayload("qc", payload);
        onSuccess();
        handleClose();
        return;
      }

      const result = await submitQCInspection(payload);

      if (result.success) {
        onSuccess();
        handleClose();
      } else {
        setErrorMsg(result.error || "Gagal menyimpan hasil inspeksi.");
      }
    } catch (err: any) {
      if (err.message?.includes("fetch") || err.message?.includes("Network") || !navigator.onLine) {
         const { addPendingPayload } = await import("@/lib/offline-store");
         await addPendingPayload("qc", {
            details: Object.keys(selections).map(detailId => ({ detailId, finalInspectionId: selections[detailId] })),
            ...data
         });
         onSuccess();
         handleClose();
      } else {
         setErrorMsg("Terjadi kesalahan jaringan atau server saat memproses laporan.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ClipboardList className="w-5 h-5 text-sky-600"/> Form Inspeksi QC (Batch)</h3>
            <p className="text-xs text-slate-500 font-medium">Isi seluruh data inspeksi untuk {Object.keys(selections).length} baris yang telah Anda pilih gradenya.</p>
          </div>
          <button onClick={handleClose} className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors text-slate-500 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold border border-red-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Context Info */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1 text-[9px]">Operator</span>
                <span className="font-bold text-slate-800">{headerData.operator || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1 text-[9px]">Mesin</span>
                <span className="font-bold text-slate-800">{headerData.nomor_mc || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1 text-[9px]">Desain</span>
                <span className="font-bold text-slate-800">{headerData.design_id || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1 text-[9px]">Potongan</span>
                <span className="font-bold text-slate-800">{headerData.potongan_ke || '-'}</span>
              </div>
            </div>
          </div>

          <form id="qc-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Bagian 1: Waktu & Petugas */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2"><User className="w-4 h-4 text-sky-500"/> Informasi Inspeksi</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Petugas 1</label>
                  <input type="text" {...register("petugas_inspeksi")} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-sky-500 outline-none" />
                  {errors.petugas_inspeksi && <p className="text-red-500 text-[10px] mt-1">{errors.petugas_inspeksi.message}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Petugas 2</label>
                  <input type="text" {...register("petugas_inspeksi_2")} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-sky-500 outline-none" />
                  {errors.petugas_inspeksi_2 && <p className="text-red-500 text-[10px] mt-1">{errors.petugas_inspeksi_2.message}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Tanggal QC</label>
                  <input type="date" {...register("tanggal_inspeksi")} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-sky-500 outline-none" />
                  {errors.tanggal_inspeksi && <p className="text-red-500 text-[10px] mt-1">{errors.tanggal_inspeksi.message}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Start Inspect</label>
                  <input type="time" {...register("start_inspect")} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-sky-500 outline-none" />
                  {errors.start_inspect && <p className="text-red-500 text-[10px] mt-1">{errors.start_inspect.message}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Finish Inspect</label>
                  <input type="time" {...register("finish_inspect")} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-sky-500 outline-none" />
                  {errors.finish_inspect && <p className="text-red-500 text-[10px] mt-1">{errors.finish_inspect.message}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Tgl Potong</label>
                  <input type="date" {...register("tanggal_potong")} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-sky-500 outline-none" />
                  {errors.tanggal_potong && <p className="text-red-500 text-[10px] mt-1">{errors.tanggal_potong.message}</p>}
                </div>
              </div>
            </div>

            {/* Bagian 2: Hasil Fisik */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2"><Scale className="w-4 h-4 text-emerald-500"/> Data Fisik & Matching</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Berat Produksi (kg)</label>
                  <input type="number" step="0.01" {...register("berat_produksi", { valueAsNumber: true })} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-sky-500 outline-none" />
                  {errors.berat_produksi && <p className="text-red-500 text-[10px] mt-1">{errors.berat_produksi.message}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Berat Inspecting (kg)</label>
                  <input type="number" step="0.01" {...register("berat_inspecting", { valueAsNumber: true })} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-sky-500 outline-none" />
                  {errors.berat_inspecting && <p className="text-red-500 text-[10px] mt-1">{errors.berat_inspecting.message}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Hasil Matching</label>
                  <input type="text" {...register("hasil_matching")} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-sky-500 outline-none" placeholder="Teks bebas..." />
                  {errors.hasil_matching && <p className="text-red-500 text-[10px] mt-1">{errors.hasil_matching.message}</p>}
                </div>
              </div>
            </div>

            {/* Bagian 3: Rincian Grade */}
            <div className="grid grid-cols-2 gap-x-3 sm:gap-x-6 gap-y-6">
              {/* Grade Produksi */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Total Grade (Produksi)</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Grade A</label>
                    <input type="number" {...register("prod_grade_a", { valueAsNumber: true })} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:border-sky-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Grade B</label>
                    <input type="number" {...register("prod_grade_b", { valueAsNumber: true })} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:border-sky-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">BS</label>
                    <input type="number" {...register("prod_bs", { valueAsNumber: true })} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:border-sky-500 outline-none" />
                  </div>
                </div>
              </div>
              
              {/* Grade QC */}
              <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Total Grade (QC)</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Grade A</label>
                    <input type="number" {...register("qc_grade_a", { valueAsNumber: true })} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:border-sky-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Grade B</label>
                    <input type="number" {...register("qc_grade_b", { valueAsNumber: true })} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:border-sky-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">BS</label>
                    <input type="number" {...register("qc_bs", { valueAsNumber: true })} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:border-sky-500 outline-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian 4: Data Mending */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-orange-500"/> Informasi Mending (Opsional)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Petugas Mending</label>
                  <input type="text" {...register("petugas_mending")} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-sky-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Tgl Mending</label>
                  <input type="date" {...register("tanggal_mending")} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-sky-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Start Mending</label>
                  <input type="time" {...register("start_mending")} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-sky-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Finish Mending</label>
                  <input type="time" {...register("finish_mending")} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-sky-500 outline-none" />
                </div>
              </div>
            </div>

            {/* Catatan Tambahan */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Catatan Tambahan QC (Opsional)</label>
              <textarea
                {...register("notes")}
                className="w-full h-16 p-3 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-[#0070bc]/20 focus:border-[#0070bc] outline-none transition-all resize-none"
                placeholder="Keterangan perbaikan, jenis cacat, dll..."
              />
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button 
            type="button" 
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>
          <button 
            type="submit" 
            form="qc-form"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-[#0070bc] text-white hover:bg-[#004777] transition-colors shadow-lg shadow-[#0070bc]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Simpan Keputusan QC
          </button>
        </div>
      </div>
    </div>
  );
}
