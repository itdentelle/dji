"use client";

import { useState, useEffect } from "react";
import { getMonthlyMachineReport, MonthlyMachineReportData } from "@/actions/report-actions";
import { getMachineStatuses } from "@/actions/dashboard-actions";
import { FileSpreadsheet, Loader2, Calendar, Monitor, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function MonthlyMachineReportPage() {
  const [machines, setMachines] = useState<string[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  const [reportData, setReportData] = useState<MonthlyMachineReportData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch available machines
    const fetchMachines = async () => {
      const res = await getMachineStatuses();
      if (res.success && res.data) {
        const mcList = res.data.map(m => m.mesin_id).sort();
        setMachines(mcList);
        if (mcList.length > 0) {
          setSelectedMachine(mcList[0]);
        }
      } else {
        // Fallback
        setMachines(["R1", "R2", "R3B", "R1C", "R2C", "R11", "R12", "R16", "T1C", "T2A"]);
        setSelectedMachine("R1");
      }
    };
    fetchMachines();
  }, []);

  useEffect(() => {
    if (selectedMachine && selectedMonth && selectedYear) {
      loadReportData();
    }
  }, [selectedMachine, selectedMonth, selectedYear]);

  const loadReportData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getMonthlyMachineReport(selectedMonth, selectedYear, selectedMachine);
      if (res.success && res.data) {
        setReportData(res.data);
      } else {
        setError(res.error || "Gagal memuat data laporan.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const months = [
    { value: 1, label: "Januari" }, { value: 2, label: "Februari" }, { value: 3, label: "Maret" },
    { value: 4, label: "April" }, { value: 5, label: "Mei" }, { value: 6, label: "Juni" },
    { value: 7, label: "Juli" }, { value: 8, label: "Agustus" }, { value: 9, label: "September" },
    { value: 10, label: "Oktober" }, { value: 11, label: "November" }, { value: 12, label: "Desember" }
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const shiftDurationSecs = 28800; // 8 hours

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 font-sans pb-24">
      {/* Header */}
      <div className="max-w-[1400px] mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Link href="/dashboard" className="hover:text-slate-800 transition-colors flex items-center gap-1 text-sm font-semibold">
                <ArrowLeft className="w-4 h-4" /> Kembali
              </Link>
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center shadow-inner">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              Laporan Bulanan Mesin
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Laporan rekapitulasi produksi dan cacat per bulan untuk masing-masing mesin.</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
              <Monitor className="w-4 h-4 text-slate-400" />
              <select
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer min-w-[80px]"
              >
                {machines.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
              >
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <span className="text-slate-300 font-bold">/</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            
            <button 
              onClick={loadReportData}
              disabled={isLoading}
              className="bg-sky-600 hover:bg-sky-700 text-white p-2.5 rounded-xl shadow-md transition-all flex items-center justify-center min-w-[44px]"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Monitor className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 font-semibold animate-fadeIn">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden relative">
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-[#e67e22]/20 to-orange-50 px-6 py-4 border-b border-orange-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="px-5 py-2 bg-[#e67e22] text-white font-black text-xl rounded-lg shadow-sm">
                {selectedMachine}
              </div>
              <div className="text-sm font-bold text-slate-600">
                01/{selectedMonth.toString().padStart(2, '0')}/{selectedYear} - {new Date(selectedYear, selectedMonth, 0).getDate()}/{selectedMonth.toString().padStart(2, '0')}/{selectedYear}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto custom-scrollbar relative min-h-[400px]">
            {isLoading && (
              <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
                  <p className="font-bold text-slate-500 text-sm animate-pulse">Menyusun Laporan...</p>
                </div>
              </div>
            )}
            
            <table className="w-full border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-slate-100/80 text-[10px] font-black text-slate-700 uppercase tracking-widest text-center">
                  <th className="border border-slate-300 p-2 min-w-[40px] sticky left-0 bg-slate-100/90 z-20">Tanggal</th>
                  <th className="border border-slate-300 p-2 min-w-[100px]">Desain</th>
                  <th className="border border-slate-300 p-2 min-w-[120px]">Keterangan</th>
                  <th className="border border-slate-300 p-2 min-w-[70px]">Courses</th>
                  <th className="border border-slate-300 p-2 min-w-[60px]">RPM</th>
                  <th className="border border-slate-300 p-2 min-w-[60px]">Eff 100%</th>
                  <th className="border border-slate-300 p-2 min-w-[50px] bg-sky-50">Team</th>
                  <th className="border border-slate-300 p-2 min-w-[120px]">Nama Operator</th>
                  <th className="border border-slate-300 p-2 min-w-[70px]">Hasil Produksi</th>
                  <th className="border border-slate-300 p-2 min-w-[80px]">Persentase dari 100%</th>
                  <th className="border border-slate-300 p-2 min-w-[70px]">Jumlah Cacat</th>
                  <th className="border border-slate-300 p-2 min-w-[80px]">Persentase Cacat</th>
                  <th colSpan={8} className="border border-slate-300 p-1 bg-amber-50">Kode Tindakan</th>
                  <th className="border border-slate-300 p-2 min-w-[80px]">Downtime (Detik)</th>
                  <th className="border border-slate-300 p-2 min-w-[90px]">Persentase Waktu Efektif</th>
                </tr>
                <tr className="bg-slate-100/60 text-[10px] font-bold text-slate-600 text-center">
                  <th colSpan={12} className="border border-slate-300"></th>
                  <th className="border border-slate-300 p-1 w-8 bg-amber-50/50">A</th>
                  <th className="border border-slate-300 p-1 w-8 bg-amber-50/50">B</th>
                  <th className="border border-slate-300 p-1 w-8 bg-amber-50/50">C</th>
                  <th className="border border-slate-300 p-1 w-8 bg-amber-50/50">D</th>
                  <th className="border border-slate-300 p-1 w-8 bg-amber-50/50">E</th>
                  <th className="border border-slate-300 p-1 w-8 bg-amber-50/50">F</th>
                  <th className="border border-slate-300 p-1 w-8 bg-amber-50/50">G</th>
                  <th className="border border-slate-300 p-1 w-8 bg-amber-50/50">H</th>
                  <th colSpan={2} className="border border-slate-300"></th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-semibold text-slate-700 bg-white">
                {reportData.map((dayData) => {
                  const teams = ["A", "B", "C"];
                  
                  return teams.map((team, idx) => {
                    const isFirst = idx === 0;
                    const td = dayData.teamData[team];
                    
                    const p100 = td.hasil_produksi > 0 && dayData.eff_100 > 0 ? ((td.hasil_produksi / dayData.eff_100) * 100).toFixed(2) + "%" : "0.00%";
                    const pCacat = td.jumlah_cacat > 0 && td.hasil_produksi > 0 ? ((td.jumlah_cacat / td.hasil_produksi) * 100).toFixed(2) + "%" : "0.00%";
                    const pEff = ((shiftDurationSecs - td.downtime_detik) / shiftDurationSecs * 100).toFixed(2) + "%";

                    // The background color for Team cell in excel is often light orange for empty or plain.
                    // We'll alternate slightly for rows to look like the image.
                    const rowBgClass = team === "B" ? "bg-[#fdf9f4]" : (team === "C" ? "bg-[#faf5ec]" : "bg-white");

                    return (
                      <tr key={`${dayData.tanggal}-${team}`} className={`${rowBgClass} hover:bg-sky-50/50 transition-colors`}>
                        {isFirst && (
                          <>
                            <td rowSpan={3} className="border border-slate-300 p-2 text-center sticky left-0 bg-slate-50 z-10">{dayData.tanggal}</td>
                            <td rowSpan={3} className="border border-slate-300 p-2 text-center font-bold text-slate-800">{dayData.desain}</td>
                            <td rowSpan={3} className="border border-slate-300 p-2"></td>
                            <td rowSpan={3} className="border border-slate-300 p-2 text-center">{dayData.courses || ""}</td>
                            <td rowSpan={3} className="border border-slate-300 p-2 text-center">{dayData.rpm || ""}</td>
                            <td rowSpan={3} className="border border-slate-300 p-2 text-center">{dayData.eff_100 || ""}</td>
                          </>
                        )}
                        <td className="border border-slate-300 p-1.5 text-center font-black text-slate-500 bg-slate-50/50">{team}</td>
                        <td className="border border-slate-300 p-1.5 px-3 truncate max-w-[120px]">{td.operator_name}</td>
                        <td className="border border-slate-300 p-1.5 text-center bg-sky-50/30">{td.hasil_produksi}</td>
                        <td className="border border-slate-300 p-1.5 text-center font-medium">{p100}</td>
                        <td className="border border-slate-300 p-1.5 text-center bg-rose-50/40 text-rose-700">{td.jumlah_cacat}</td>
                        <td className="border border-slate-300 p-1.5 text-center text-rose-600 font-medium">{pCacat}</td>
                        
                        {/* KODE TINDAKAN */}
                        {["A", "B", "C", "D", "E", "F", "G", "H"].map(k => (
                          <td key={k} className="border border-slate-300 p-1 text-center text-slate-500">
                            {td.kode_tindakan[k] || 0}
                          </td>
                        ))}
                        
                        <td className="border border-slate-300 p-1.5 text-center text-orange-600 bg-orange-50/30">{td.downtime_detik}</td>
                        <td className="border border-slate-300 p-1.5 text-center font-bold text-emerald-600">{pEff}</td>
                      </tr>
                    );
                  });
                })}

                {reportData.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={24} className="p-8 text-center text-slate-500 font-semibold">
                      Belum ada data untuk bulan dan mesin ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
