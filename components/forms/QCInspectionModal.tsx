"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, CheckCircle, AlertTriangle, XCircle, Camera, UploadCloud, Loader2 } from "lucide-react";
import { submitQCInspection } from "@/actions/qc-actions";

// Using a similar simple compression as EmployeeForm for photo_after
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const qcSchema = z.object({
  finalInspectionId: z.string().min(1, "Status Final harus dipilih"),
  notes: z.string().optional(),
  fotoAfter: z.string().nullable().optional(),
});

type QCFormData = z.infer<typeof qcSchema>;

interface QCInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  production: any;
  onSuccess: () => void;
}

export default function QCInspectionModal({ isOpen, onClose, production, onSuccess }: QCInspectionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<QCFormData>({
    resolver: zodResolver(qcSchema),
    defaultValues: {
      finalInspectionId: "",
      notes: "",
      fotoAfter: null,
    }
  });

  const watchFinalId = watch("finalInspectionId");

  if (!isOpen || !production) return null;

  const handleClose = () => {
    reset();
    setPreview(null);
    setErrorMsg(null);
    onClose();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setErrorMsg(null);

      // Local preview
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      // We'll just convert to base64 and upload it via the same upload endpoint we have in employee-actions
      // Let's dynamically import the upload function
      const { uploadProductionPhoto } = await import("@/actions/employee-actions");
      
      const base64Data = await fileToBase64(file);
      const fileName = `qc_after_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

      const uploadResult = await uploadProductionPhoto(base64Data, fileName);
      if (!uploadResult.success || !uploadResult.publicUrl) {
        throw new Error(uploadResult.error || "Gagal mengunggah foto QC.");
      }

      setValue('fotoAfter', uploadResult.publicUrl);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal upload foto");
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: QCFormData) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const result = await submitQCInspection({
        productionId: production.id,
        finalInspectionId: parseInt(data.finalInspectionId),
        notes: data.notes,
        fotoAfterUrl: data.fotoAfter
      });

      if (result.success) {
        onSuccess();
        handleClose();
      } else {
        setErrorMsg(result.error || "Gagal menyimpan hasil inspeksi.");
      }
    } catch (err) {
      setErrorMsg("Terjadi kesalahan server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Form Inspeksi QC</h3>
            <p className="text-xs text-slate-500 font-medium">Tentukan grade akhir untuk produk ini</p>
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
                <span className="font-bold text-slate-800">{production.operators?.nama_operator || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1 text-[9px]">Desain</span>
                <span className="font-bold text-slate-800">{production.designs?.nama_design || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1 text-[9px]">Potongan / Panel</span>
                <span className="font-bold text-slate-800">Ke-{production.potongan_ke || '?'} / Panel {production.panel_no || '?'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1 text-[9px]">Status Loper</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold ${
                  production.status_inspeksi ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {production.status_inspeksi ? 'Lolos' : 'Recheck (BS)'}
                </span>
              </div>
            </div>
            {production.keterangan && (
              <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs">
                <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1 text-[9px]">Catatan Loper / Mesin</span>
                <p className="text-slate-700 font-medium italic">"{production.keterangan}"</p>
              </div>
            )}
            {production.foto_before && (
               <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-2 text-[9px]">Foto dari Loper</span>
                  <img src={production.foto_before} alt="Before" className="w-32 h-24 object-cover rounded-lg border border-slate-200" />
               </div>
            )}
          </div>

          {/* QC Form */}
          <form id="qc-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Final Grade Selection */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Pilih Grade Akhir *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className={`flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${watchFinalId === "1" ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 hover:border-slate-300 text-slate-600"}`}>
                  <input type="radio" value="1" {...register("finalInspectionId")} className="sr-only" />
                  <CheckCircle className="w-5 h-5 mb-1" />
                  <span className="font-bold text-sm">GRADE A</span>
                </label>
                <label className={`flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${watchFinalId === "2" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-200 hover:border-slate-300 text-slate-600"}`}>
                  <input type="radio" value="2" {...register("finalInspectionId")} className="sr-only" />
                  <AlertTriangle className="w-5 h-5 mb-1" />
                  <span className="font-bold text-sm">GRADE B</span>
                </label>
                <label className={`flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${watchFinalId === "3" ? "border-rose-500 bg-rose-50 text-rose-700" : "border-slate-200 hover:border-slate-300 text-slate-600"}`}>
                  <input type="radio" value="3" {...register("finalInspectionId")} className="sr-only" />
                  <XCircle className="w-5 h-5 mb-1" />
                  <span className="font-bold text-sm">BS (Reject)</span>
                </label>
              </div>
              {errors.finalInspectionId && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.finalInspectionId.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Notes */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Catatan Tambahan QC</label>
                <textarea
                  {...register("notes")}
                  className="w-full h-24 p-3 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-[#0070bc]/20 focus:border-[#0070bc] outline-none transition-all resize-none"
                  placeholder="Keterangan perbaikan, jenis cacat, dll..."
                />
              </div>

              {/* Upload Foto After */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Foto Sesudah (Opsional)</label>
                <div className="relative w-full h-24 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center overflow-hidden group">
                  {preview ? (
                    <>
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-slate-400 gap-1 pointer-events-none">
                      {isUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                      ) : (
                        <>
                          <Camera className="w-5 h-5" />
                          <span className="text-[9px] font-semibold uppercase">Klik / Upload Foto</span>
                        </>
                      )}
                    </div>
                  )}
                  {!isUploading && (
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      onChange={handlePhotoUpload} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                  )}
                </div>
              </div>
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
            disabled={isSubmitting || isUploading}
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
