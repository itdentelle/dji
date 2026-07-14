"use client";

import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { PowerOff, Save, RefreshCw, CheckCircle2 } from "lucide-react";
import { submitStatusMesin, StatusMesinInput } from "@/actions/status-actions";
import { useAuth } from "@/lib/auth-context";

// Opsi Mesin
const MESIN_OPTIONS = ["R1", "R2", "R3B", "R1C", "R2C", "R11", "R12", "R16", "T1C", "T2A", "Warping D6", "Winding"];

// Opsi Grup
const FALLBACK_GROUPS = [
  { id: 1, name: "A" },
  { id: 2, name: "B" },
  { id: 3, name: "C" },
];

// Opsi Operator
const FALLBACK_OPERATORS = [
  { id: 1, name: "Rohmat", shift: "A" }, { id: 2, name: "M.Alwi", shift: "A" }, { id: 3, name: "Anwar", shift: "A" },
  { id: 4, name: "Jaya", shift: "A" }, { id: 5, name: "Riki S", shift: "A" }, { id: 6, name: "Sandi M", shift: "A" },
  { id: 7, name: "Padlan", shift: "A" }, { id: 8, name: "Rissa A", shift: "A" }, { id: 9, name: "Devi K", shift: "A" },
  { id: 10, name: "Novi S", shift: "A" }, { id: 11, name: "Udin", shift: "A" },
  { id: 12, name: "Irfan", shift: "B" }, { id: 13, name: "Anton", shift: "B" }, { id: 14, name: "Ahmad S", shift: "B" },
  { id: 15, name: "Saepudin", shift: "B" }, { id: 16, name: "Parid", shift: "B" }, { id: 17, name: "Noval", shift: "B" },
  { id: 18, name: "Sigit", shift: "B" }, { id: 19, name: "Rani Y", shift: "B" }, { id: 20, name: "Yanti P", shift: "B" },
  { id: 21, name: "Irma P", shift: "B" }, { id: 22, name: "Aris W", shift: "B" },
  { id: 23, name: "Tubagus", shift: "C" }, { id: 24, name: "Andri Y", shift: "C" }, { id: 25, name: "Royana", shift: "C" },
  { id: 26, name: "Komara", shift: "C" }, { id: 27, name: "Sopian", shift: "C" }, { id: 28, name: "Iki S", shift: "C" },
  { id: 29, name: "Hardi", shift: "C" }, { id: 30, name: "Rini D", shift: "C" }, { id: 31, name: "Neneng", shift: "C" },
  { id: 32, name: "Rina R", shift: "C" }, { id: 33, name: "Farhan", shift: "C" }
];

export default function StatusMesinForm() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);
  
  const idempotencyKeyRef = useRef(Math.random().toString(36).substring(2, 15));

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<any>({
    defaultValues: {
      nomorMc: "",
      grupId: "",
      operatorId: "",
      pick: "",
      course: "",
      rpm: "",
      designId: "",
      status: "",
      tanggalOff: new Date().toISOString().split("T")[0],
    }
  });

  const selectedGrupId = watch("grupId");
  const selectedGroup = FALLBACK_GROUPS.find(g => g.id.toString() === selectedGrupId);
  
  const filteredOperators = FALLBACK_OPERATORS.filter(op => {
    if (!selectedGroup) return false;
    return op.shift === selectedGroup.name;
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    data.idempotencyKey = idempotencyKeyRef.current;
    
    // Convert operatorId to pic
    const operator = FALLBACK_OPERATORS.find(o => o.id.toString() === data.operatorId);
    data.pic = operator ? operator.name : (user?.fullName || "");
    data.status = data.status ? data.status.toUpperCase() : "";
    
    try {
      const result = await submitStatusMesin(data);
      if (result.success) {
        setSuccessData(data);
        idempotencyKeyRef.current = Math.random().toString(36).substring(2, 15);
      } else {
        setErrorMsg(result.error || "Gagal menyimpan status mesin.");
      }
    } catch (err: any) {
      setErrorMsg("Terjadi kesalahan sistem: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    setSuccessData(null);
    reset({
      nomorMc: "",
      status: "",
      grupId: "",
      operatorId: "",
      pick: "",
      course: "",
      rpm: "",
      designId: "",
      tanggalOff: new Date().toISOString().split("T")[0],
    });
  };

  if (successData) {
    return (
      <div className="w-full max-w-lg bg-white border border-[#e9ecef] rounded-[24px] p-6 shadow-xl flex flex-col items-center justify-center text-center animate-scaleIn">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">
          Status Berhasil Dicatat!
        </h2>
        <p className="text-sm text-slate-500 font-medium mb-6">
          Mesin <strong>{successData.nomorMc}</strong> dilaporkan sedang <strong>{successData.status}</strong> pada tanggal <strong>{successData.tanggalOff}</strong>.
        </p>
        <button
          onClick={handleCloseSuccess}
          className="h-12 px-8 bg-[#0070bc] hover:bg-[#004777] active:scale-95 text-white text-base font-bold rounded-xl transition-all shadow-md"
        >
          Lapor Mesin Lain
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-[#e9ecef] rounded-[24px] p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none opacity-50"></div>
      
      <div className="relative z-10 flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600">
          <PowerOff className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800">Lapor Mesin Off</h2>
          <p className="text-[11px] text-slate-500 font-medium">Bypass Form Produksi untuk mesin libur/stop panjang.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 relative z-10">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* KOLOM KIRI */}
          <div className="flex flex-col gap-5">
            {/* Tanggal */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                Tanggal
              </label>
              <input
                type="date"
                {...register("tanggalOff", { required: "Tanggal wajib diisi" })}
                className="h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:bg-white focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition-all"
              />
              {errors.tanggalOff && <p className="text-xs text-rose-500 font-bold">{errors.tanggalOff?.message as string}</p>}
            </div>

            {/* Grup / Shift */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                Grup / Shift
              </label>
              <select
                {...register("grupId", { required: "Grup wajib dipilih" })}
                onChange={(e) => {
                  setValue("grupId", e.target.value);
                  setValue("operatorId", ""); // Reset operator saat grup ganti
                }}
                className="h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 focus:bg-white focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">-- Pilih Grup / Shift --</option>
                {FALLBACK_GROUPS.map(g => (
                  <option key={g.id} value={g.id}>Grup {g.name}</option>
                ))}
              </select>
              {errors.grupId && <p className="text-xs text-rose-500 font-bold">{errors.grupId?.message as string}</p>}
            </div>

            {/* Nama Operator (PIC) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                Operator Bertugas
              </label>
              <select
                {...register("operatorId", { required: "Operator wajib dipilih" })}
                disabled={!selectedGrupId}
                className="h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 focus:bg-white focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50"
              >
                <option value="">{selectedGrupId ? "-- Pilih Operator --" : "-- Pilih Grup Dulu --"}</option>
                {filteredOperators.map(op => (
                  <option key={op.id} value={op.id}>{op.name}</option>
                ))}
              </select>
              {errors.operatorId && <p className="text-xs text-rose-500 font-bold">{errors.operatorId?.message as string}</p>}
            </div>

            {/* Pilih Mesin */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                Pilih Mesin
              </label>
              <select
                {...register("nomorMc", { required: "Mesin wajib dipilih" })}
                className="h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 focus:bg-white focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">-- Pilih Mesin --</option>
                {MESIN_OPTIONS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {errors.nomorMc && <p className="text-xs text-rose-500 font-bold">{errors.nomorMc?.message as string}</p>}
            </div>
          </div>

          {/* KOLOM KANAN */}
          <div className="flex flex-col gap-5">
            {/* Spesifikasi Mesin */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Design</label>
                <input type="text" {...register("designId", { required: "Design wajib diisi" })} placeholder="Ketik design..." className="h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:bg-white focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition-all" />
                {errors.designId && <p className="text-xs text-rose-500 font-bold">{errors.designId?.message as string}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">RPM</label>
                <input type="text" {...register("rpm", { required: "RPM wajib diisi" })} className="h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:bg-white focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition-all" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Pick</label>
                <input type="text" {...register("pick", { required: "Pick wajib diisi" })} className="h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:bg-white focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition-all" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Course</label>
                <input type="text" {...register("course", { required: "Course wajib diisi" })} className="h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:bg-white focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition-all" />
              </div>
            </div>

            {/* Status Mesin */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Status Berhenti</label>
              <input 
                type="text" 
                {...register("status", { required: "Status mesin wajib diisi" })} 
                placeholder="Ketik status berhenti..." 
                className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:bg-white focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition-all uppercase" 
              />
              {errors.status && <p className="text-xs text-rose-500 font-bold mt-1">{errors.status?.message as string}</p>}
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 mt-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" /> Menyimpan...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" /> Laporkan Status Mesin
            </>
          )}
        </button>

      </form>
    </div>
  );
}
