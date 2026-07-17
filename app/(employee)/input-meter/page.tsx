"use client";

import React, { useEffect, useState } from "react";
import { HelpCircle } from "lucide-react";
import ContinuousForm from "@/components/forms/ContinuousForm";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

export default function ContinuousInputPage() {
  const { user } = useAuth();
  const [isDbConnected, setIsDbConnected] = useState(false);

  useEffect(() => {
    localStorage.setItem("last_input_route", "/input-meter");
    async function checkDb() {
      try {
        const supabase = createClient();
        if (
          !process.env.NEXT_PUBLIC_SUPABASE_URL ||
          process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
        ) {
          setIsDbConnected(false);
          return;
        }
        const { error } = await supabase
          .from("operators")
          .select("id")
          .limit(1);
        setIsDbConnected(!error);
      } catch (err) {
        setIsDbConnected(false);
      }
    }
    checkDb();
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center animate-fadeIn py-8 px-4 w-full">
      {/* Title Header Card */}
      <div className="w-full bg-white border border-[#e9ecef] rounded-[24px] p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 relative z-10 mb-6">
        <div className="flex flex-col gap-2 relative z-10">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex flex-wrap items-center gap-3 leading-tight">
            <span className="bg-gradient-to-r from-slate-900 via-[#004777] to-[#0070bc] bg-clip-text text-transparent drop-shadow-sm">
              Portal Operator Produksi
            </span>
          </h1>
          <p className="text-slate-500 text-sm sm:text-base font-medium max-w-2xl leading-relaxed flex items-start gap-1.5 mt-1">
            <svg
              className="w-5 h-5 text-sky-500 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Pastikan data parameter mesin rajut sudah benar sebelum mengirimkan
            formulir.
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("dji:start-meter-tour"))
            }
            className="h-11 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2"
          >
            <HelpCircle className="w-4 h-4" />
            Tutorial
          </button>

          {/* Active Session Pill */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm text-xs text-slate-600 font-medium">
            <span
              className={`w-2 h-2 rounded-full ${isDbConnected ? "bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.6)] animate-pulse" : "bg-slate-400"}`}
              title={isDbConnected ? "Live Database Terhubung" : "Database Terputus / Mock Data"}
            />
            <span className="font-bold text-[#0070bc]">
              {user?.fullName.replace(" (Demo)", "")}
            </span>
          </div>
        </div>
      </div>

      {/* Form Component Container */}
      <div className="w-full flex justify-center">
        <ContinuousForm />
      </div>
    </div>
  );
}
