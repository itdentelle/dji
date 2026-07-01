import React from "react";
import { Settings2, User, Box, FileText, CheckCircle2, Factory } from "lucide-react";

interface HeaderSummaryCardProps {
  operatorName: string;
  shiftName: string;
  nomorMc: string;
  design: string;
  onEdit: () => void;
  statusMatching: string;
  potonganKe?: string | number;
}

export default function HeaderSummaryCard({
  operatorName,
  shiftName,
  nomorMc,
  design,
  onEdit,
  statusMatching,
  potonganKe,
}: HeaderSummaryCardProps) {
  return (
    <div className="bg-gradient-to-r from-sky-50 to-white border border-sky-100 rounded-2xl p-4 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4 md:gap-8 flex-1">
        {/* Mesin & Desain */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
            <Factory className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">Mesin & Desain</span>
            <span className="text-sm font-black text-slate-800 leading-tight">
              {nomorMc || "Belum dipilih"} / {design || "-"}
            </span>
          </div>
        </div>

        {/* Operator */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Operator (Grup {shiftName})</span>
            <span className="text-sm font-black text-slate-800 leading-tight">
              {operatorName || "Belum dipilih"}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${statusMatching === "OK" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status Matching</span>
            <span className={`text-sm font-black leading-tight ${statusMatching === "OK" ? "text-emerald-700" : "text-rose-700"}`}>
              {statusMatching || "-"}
            </span>
          </div>
        </div>

        {/* Potongan Ke */}
        {potonganKe && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Box className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Potongan Ke</span>
              <span className="text-sm font-black text-slate-800 leading-tight">
                {potonganKe}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Edit Button */}
      <button
        type="button"
        onClick={onEdit}
        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-sky-50 text-sky-600 border border-sky-200 hover:border-sky-300 rounded-xl font-bold text-xs transition-colors shrink-0 shadow-sm"
      >
        <Settings2 className="w-4 h-4" />
        Ubah Konfigurasi
      </button>
    </div>
  );
}
