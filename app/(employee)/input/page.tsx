"use client";

import React from "react";
import EmployeeForm from "@/components/forms/EmployeeForm";
import { useAuth } from "@/lib/auth-context";

export default function EmployeeInputPage() {
  const { user } = useAuth();

  return (
    <div className="flex-1 flex flex-col items-center animate-fadeIn py-8 px-4 w-full">
      {/* Title Header Card */}
      <div className="w-full bg-white border border-[#e9ecef] rounded-[24px] p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 relative z-10 mb-6">
        <div className="flex flex-col gap-2 relative z-10">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex flex-wrap items-center gap-3 leading-tight">
            <span className="bg-gradient-to-r from-slate-900 via-[#004777] to-[#0070bc] bg-clip-text text-transparent drop-shadow-sm">
              Portal Operator Produksi
            </span>
          </h1>
          <p className="text-slate-500 text-sm sm:text-base font-medium max-w-2xl leading-relaxed flex items-start gap-1.5 mt-1">
            <svg className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pastikan data parameter mesin rajut sudah benar sebelum mengirimkan formulir.
          </p>
        </div>

        {/* Active Session Pill */}
        <div className="relative z-10 flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm text-xs text-slate-600 font-medium shrink-0">
          <span className="w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.6)] animate-pulse" />
          <span>Sesi: <strong className="font-bold text-[#0070bc]">{user?.fullName.replace(" (Demo)", "")}</strong></span>
          <span className="text-[9px] font-bold text-slate-500 bg-slate-100 rounded-md px-1.5 py-0.5 uppercase ml-1">
            {user?.role}
          </span>
        </div>
      </div>

      {/* Form Component Container */}
      <div className="w-full flex justify-center">
        <EmployeeForm />
      </div>
    </div>
  );
}

