"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Users, Calendar as CalendarIcon, Clock, CheckCircle, Info, RefreshCw } from "lucide-react";

export default function InputKehadiranPage() {
  const { user } = useAuth();
  const [shift, setShift] = useState("Pagi (07:00 - 15:00)");
  const [status, setStatus] = useState("Hadir");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call for the placeholder
    setTimeout(() => {
      setIsSubmitting(false);
      alert("Absensi berhasil dicatat! (Mode Demo)");
    }, 1000);
  };

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto py-8 px-4 sm:px-6 animate-fadeIn flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Header section */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0070bc] to-sky-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/30">
            <Users className="w-5 h-5" />
          </span>
          Input Kehadiran
        </h1>
        <p className="text-slate-500 text-sm mt-2 font-medium">
          Silakan rekam absensi Anda sebelum memulai shift kerja.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 mb-6 flex gap-3 shadow-sm">
        <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-sky-800 font-semibold leading-relaxed">
          Sistem ini saat ini dalam mode persiapan (coming soon). Data kehadiran saat ini masih ditarik otomatis dari aktivitas mesin Anda.
        </p>
      </div>

      {/* Form Container */}
      <div className="bg-white border border-[#e9ecef] rounded-[32px] p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Nama Pegawai (Auto-filled) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Nama Pegawai
              </label>
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-not-allowed">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-bold text-slate-700">
                  {user?.fullName || "Budi Santoso"}
                </span>
              </div>
            </div>

            {/* Tanggal (Auto-filled) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Tanggal
              </label>
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-not-allowed">
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-bold text-slate-700">
                  {today}
                </span>
              </div>
            </div>
          </div>

          {/* Shift Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pilih Shift Kerja
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {["Pagi (07:00 - 15:00)", "Sore (15:00 - 23:00)", "Malam (23:00 - 07:00)"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setShift(s)}
                  className={`flex flex-col items-start p-3 rounded-2xl border-2 transition-all ${
                    shift === s 
                    ? "border-sky-500 bg-sky-50/50 shadow-sm" 
                    : "border-slate-100 hover:border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Clock className={`w-4 h-4 ${shift === s ? "text-sky-500" : "text-slate-400"}`} />
                    <span className={`text-sm font-bold ${shift === s ? "text-slate-800" : "text-slate-600"}`}>
                      {s.split(" ")[0]}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 mt-1">
                    {s.split(" ")[1]} {s.split(" ")[2]} {s.split(" ")[3]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Status Kehadiran */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Status Kehadiran
            </label>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Hadir", color: "emerald" },
                { label: "Sakit", color: "amber" },
                { label: "Izin", color: "sky" }
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setStatus(item.label)}
                  className={`px-6 py-2.5 rounded-full text-sm font-bold border-2 transition-all flex items-center gap-2 ${
                    status === item.label
                    ? `border-${item.color}-500 bg-${item.color}-50 text-${item.color}-700`
                    : "border-slate-100 bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {status === item.label && <CheckCircle className="w-4 h-4" />}
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full relative overflow-hidden group py-4 px-6 rounded-2xl text-white font-extrabold text-sm sm:text-base transition-all duration-300 shadow-xl ${
                isSubmitting ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-[#0070bc] to-sky-500 hover:shadow-sky-500/25 hover:-translate-y-0.5"
              }`}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
              <div className="relative flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Kirim Data Absensi</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
