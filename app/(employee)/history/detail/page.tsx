"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { searchEmployeeHistory } from "@/actions/employee-actions";
import CompactHeaderCard from "@/components/forms/CompactHeaderCard";
import { Loader2, ArrowLeft, Clock, AlertCircle, Timer, Wrench, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import PanelHistoryTable from "./components/PanelHistoryTable";
import MeterHistoryTable from "./components/MeterHistoryTable";

function HistoryDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const nomor_mc = searchParams.get("mc");
  const design_id = searchParams.get("design");
  const potongan_ke = searchParams.get("potongan");
  const tgl = searchParams.get("tgl");

  const [detailData, setDetailData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!nomor_mc || !potongan_ke) {
      setErrorMsg("Parameter tidak lengkap.");
      setIsLoading(false);
      return;
    }

    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const res = await searchEmployeeHistory({
          nomor_mc: nomor_mc,
          design_id: design_id || undefined,
          potongan_ke: potongan_ke,
        });

        if (res.success && res.data && res.data.length > 0) {
          const batch = res.data.find(
            (b: any) =>
              String(b.nomor_mc || "").trim().toUpperCase() === String(nomor_mc || "").trim().toUpperCase() &&
              b.potongan_ke == potongan_ke
          );

          if (batch) {
            setDetailData(batch);
          } else {
            setDetailData(res.data[0]);
          }
        } else {
          setErrorMsg("Data tidak ditemukan.");
        }
      } catch (err: any) {
        setErrorMsg("Terjadi kesalahan jaringan.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [nomor_mc, design_id, potongan_ke, tgl]);

  const formatDurationNice = (totalSec: number | string) => {
    const sec = typeof totalSec === "string" ? parseInt(totalSec) || 0 : totalSec || 0;
    if (sec <= 0) return "0 dtk";
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;
    if (hours > 0) {
      if (minutes > 0) return `${hours} Jam ${minutes} Mnt`;
      return `${hours} Jam`;
    }
    if (minutes > 0) {
      if (seconds > 0) return `${minutes} Mnt ${seconds} Dtk`;
      return `${minutes} Mnt`;
    }
    return `${seconds} Dtk`;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[#0070bc] mb-4" />
        <span className="text-slate-500 font-medium">Memuat Detail...</span>
      </div>
    );
  }

  if (errorMsg || !detailData) {
    return (
      <div className="flex-1 p-6 sm:p-10 flex flex-col items-center justify-center min-h-[60vh]">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-lg font-bold text-slate-800">{errorMsg || "Data tidak ditemukan."}</h3>
        <button
          onClick={() => router.back()}
          className="mt-6 flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full min-w-0 animate-fadeIn">
      {/* Header Nav */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => router.push("/history")}
          className="h-9 w-9 shrink-0 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 flex items-center justify-center transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
          <span
            className="hover:text-[#0070bc] cursor-pointer transition-colors"
            onClick={() => router.push("/history")}
          >Riwayat</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-slate-700 font-black">Detail Laporan</span>
        </div>
      </div>


      <CompactHeaderCard
            nomorMc={detailData.nomor_mc}
            shiftName={detailData.panels?.[0]?.groups?.nama_grup || "-"}
            operatorName={detailData.operators_list}
            design={detailData.design_id}
            pcsCount={detailData.total_panels}
            panelPotongan={`- / ${detailData.potongan_ke}`}
            courseRpm={`${detailData.course || "-"} / ${detailData.rpm || "-"}`}
            noCustomer={detailData.no_customer || "-"}
            noOrder={detailData.no_order_barang || "-"}
            tanggalPotong={detailData.tanggal_potong || "-"}
            statusMatching={detailData.status_matching || "-"}
            pick={detailData.pick || "-"}
            benangDasar={detailData.jenis_benang_dasar || "-"}
            liner={detailData.liner || "-"}
            heavy={detailData.heavy || "-"}
            shadow={detailData.shadow || "-"}
            pinggiran={detailData.pinggiran || "-"}
            tanggalProduksi={detailData.tgl}
            course={detailData.course}
            rpm={detailData.rpm}
            potonganKe={detailData.potongan_ke}
      />


      {/* Downtime Info */}
      {detailData.total_downtime_detik > 0 && (
        <div className="mb-6 rounded-xl overflow-hidden border border-amber-200 shadow-sm">
          <div className="bg-amber-500 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Timer className="w-4 h-4 text-white shrink-0" />
              <span className="text-white text-xs font-black uppercase tracking-wide">Downtime Terdeteksi</span>
            </div>
            <span className="text-white font-black text-sm sm:text-base whitespace-nowrap">
              {formatDurationNice(detailData.total_downtime_detik)}
            </span>
          </div>
        </div>
      )}

      {/* Laporan Produksi Table */}
      <div className="pb-4">
          {(() => {
            // Group panels by pcs
            const pcsGroups: { [key: string]: any[] } = {};

            // Deduplicate by panel.id
            const uniqueById = new Map();
            (detailData.panels || []).forEach((panel: any) => {
              if (!uniqueById.has(panel.id)) {
                uniqueById.set(panel.id, { ...panel, production_details: [...(panel.production_details || [])] });
              }
            });

            // Deduplicate by panel_no for non-METERAN
            const deduplicatedPanels = Array.from(uniqueById.values());
            const finalPanels: any[] = [];
            const seenPanelNo = new Map<string, any>();

            deduplicatedPanels.forEach((panel: any) => {
              if (panel.panel_no === "METERAN") {
                finalPanels.push(panel);
              } else {
                const key = panel.panel_no;
                const existing = seenPanelNo.get(key);
                if (existing) {
                  // Merge production details
                  existing.production_details.push(...(panel.production_details || []));

                  // Merge downtime events
                  let existingDt: any[] = [];
                  try { existingDt = typeof existing.downtime_events === 'string' ? JSON.parse(existing.downtime_events) : (existing.downtime_events || []); } catch (e) { }
                  let newDt: any[] = [];
                  try { newDt = typeof panel.downtime_events === 'string' ? JSON.parse(panel.downtime_events) : (panel.downtime_events || []); } catch (e) { }
                  existing.downtime_events = [...existingDt, ...newDt];

                  // Update total PCS if the new one has more PCS
                  const existingPcs = parseInt(existing.pcs || "1");
                  const newPcs = parseInt(panel.pcs || "1");
                  if (newPcs > existingPcs) existing.pcs = newPcs.toString();
                } else {
                  seenPanelNo.set(key, panel);
                }
              }
            });

            finalPanels.push(...Array.from(seenPanelNo.values()));

             // Group finalPanels by operator to find the oldest panel ID for each operator
             const oldestPanelIdByOperator = new Map<string, string>();
             const sortedByTime = [...finalPanels].sort((a, b) => String(a.tanggal_jam || "").localeCompare(String(b.tanggal_jam || "")));
             sortedByTime.forEach((p: any) => {
               const opr = p.operators?.nama_operator || p.pic || p.created_by_name || "";
               const grp = p.groups?.nama_grup || "";
               const operatorStr = (grp ? `(${grp}) ` : '') + opr;
               if (!oldestPanelIdByOperator.has(operatorStr)) {
                 oldestPanelIdByOperator.set(operatorStr, p.id);
               }
             });

             finalPanels.forEach((panel: any) => {
               if (panel.panel_no === "Downtime Mekanik (Direct)" || panel.pcs === 0 || panel.pcs === "0") {
                 return;
               }
               const totalPcs = parseInt(panel.pcs ?? "1");
               for (let i = 1; i <= totalPcs; i++) {
                 const pcsKey = i.toString();
                 if (!pcsGroups[pcsKey]) pcsGroups[pcsKey] = [];

                 const panelClone = { ...panel };
                 
                 let dtEvents: any[] = [];
                 try {
                   if (typeof panelClone.downtime_events === 'string') {
                     dtEvents = JSON.parse(panelClone.downtime_events);
                   } else if (Array.isArray(panelClone.downtime_events)) {
                     dtEvents = panelClone.downtime_events;
                   }
                 } catch (e) { }

                 const matchedEvents = dtEvents.filter(
                   (e: any) =>
                     !e.pcsKe ||
                     e.pcsKe === "Semua" ||
                     e.pcsKe.split(",").map((x: any) => x.trim()).includes(pcsKey)
                 );

                 let hasDetails = false;
                 if (panelClone.production_details) {
                   const filteredDetails = panelClone.production_details.filter((d: any) => {
                     const pIndex = d.pcs_index ? parseInt(d.pcs_index) : 1;
                     return pIndex === i;
                   });
                   const hasErrors = filteredDetails.some((d: any) => d.kategori_masalah || d.keterangan_cacat);
                   if (hasErrors) {
                     hasDetails = true;
                     panelClone.production_details = filteredDetails;
                   } else {
                     panelClone.production_details = [];
                   }
                 }

                 const isIstirahat = panelClone.production_details?.some((d: any) => d.keterangan_cacat?.toUpperCase().includes("ISTIRAHAT")) ||
                                     dtEvents.some((e: any) => e.kategori?.toUpperCase().includes("ISTIRAHAT"));

                 const isMeterInput = panelClone.panel_no === "METERAN";
                 const opr = panelClone.operators?.nama_operator || panelClone.pic || panelClone.created_by_name || "";
                 const grp = panelClone.groups?.nama_grup || "";
                 const operatorStr = (grp ? `(${grp}) ` : '') + opr;
                 const isOldest = oldestPanelIdByOperator.get(operatorStr) === panelClone.id;
                 const isFinishReport = isMeterInput && panelClone.meter_akhir !== null && panelClone.meter_akhir !== undefined && String(panelClone.meter_akhir).trim() !== "";

                 if (isMeterInput) {
                   if (isOldest || isFinishReport || matchedEvents.length > 0 || hasDetails || isIstirahat) {
                     pcsGroups[pcsKey].push(panelClone);
                   }
                 } else {
                   if (panelClone.production_details.length === 0) {
                     panelClone.production_details = panel.production_details?.filter((d: any) => {
                       const pIndex = d.pcs_index ? parseInt(d.pcs_index) : 1;
                       return pIndex === i;
                     }) || [];
                   }
                   pcsGroups[pcsKey].push(panelClone);
                 }
               }
             });

            // Sort keys numerically
            const sortedPcsKeys = Object.keys(pcsGroups).sort((a, b) => parseInt(a) - parseInt(b));
            if (sortedPcsKeys.length === 0) return null;

            const isMeterReport = detailData.panels?.some((p: any) => p.panel_no === "METERAN");

            return (
              <div className="mb-6">
                {!isMeterReport && (
                  <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    Rincian per Panel
                  </h4>
                )}
                <div className="w-full overflow-x-auto pb-4 custom-scrollbar bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex w-max min-w-full gap-8">
                    {sortedPcsKeys.map((pcsKey) => {
                      const pcsLabel = `PCS ${pcsKey}`;
                      const panels = pcsGroups[pcsKey].sort((a, b) => {
                          if (a.panel_no === "METERAN" && b.panel_no === "METERAN") {
                            return String(a.tanggal_jam || "").localeCompare(String(b.tanggal_jam || ""));
                          }
                          if (a.panel_no === "METERAN") return 1;
                          if (b.panel_no === "METERAN") return -1;
                          
                          const pA = parseInt(a.panel_no || "0");
                          const pB = parseInt(b.panel_no || "0");
                          if (pA === pB) {
                            const isABs = String(a.panel_no || "").includes("(BS)") || String(a.panel_no || "").includes("(GAGAL)");
                            const isBBs = String(b.panel_no || "").includes("(BS)") || String(b.panel_no || "").includes("(GAGAL)");
                            if (isABs && !isBBs) return -1;
                            if (!isABs && isBBs) return 1;
                            return String(a.tanggal_jam || "").localeCompare(String(b.tanggal_jam || ""));
                          }
                          return pA - pB;
                        });

                      const isMeter = detailData.is_meter || panels.some((p: any) => p.panel_no === "METERAN");

                      return (
                        <div key={pcsKey} className="w-min flex-none bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                          <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 text-center">
                            <span className="font-black text-slate-800 text-sm tracking-wider uppercase">{pcsLabel}</span>
                          </div>
                          {isMeter ? (
                            <MeterHistoryTable panels={panels} pcsKey={pcsKey} />
                          ) : (
                            <PanelHistoryTable panels={panels} pcsKey={pcsKey} />
                          )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Render Mechanic / Special Downtimes explicitly in Table format */}
        {(() => {
           const mechanicPanels = detailData.panels?.filter((p: any) => {
             if (p.panel_no === "Downtime Mekanik (Direct)" || p.panel_no === "BERHENTI") return true;
             if (!p.pcs || parseInt(p.pcs) === 0) return true;
             let dtEvents: any[] = [];
             try { dtEvents = typeof p.downtime_events === 'string' ? JSON.parse(p.downtime_events) : (p.downtime_events || []); } catch(e){}
             if (dtEvents && dtEvents.length > 0) return true;
             if (p.downtime_records && p.downtime_records.length > 0) return true;
             if (p.total_downtime_detik && p.total_downtime_detik > 0) return true;
             return false;
           });

           if (!mechanicPanels || mechanicPanels.length === 0) return null;

           const cleanPenanggungJawab = (raw: string) => {
              if (!raw) return "-";
              
              // Handle "Perbaikan Khusus (Name)"
              const pkMatch = raw.match(/^Perbaikan Khusus\s*\((.*)\)$/i);
              if (pkMatch && pkMatch[1]) return pkMatch[1].trim();

              // Handle "Operator (Name)"
              const opMatch = raw.match(/^Operator\s*\((.*)\)$/i);
              if (opMatch && opMatch[1]) return opMatch[1].trim();

              return raw
                .replace(/^Perbaikan Khusus\s*/i, "")
                .replace(/^Operator\s*/i, "")
                .trim() || raw;
            };
           
           const rows: any[] = [];
           mechanicPanels.forEach((mp: any) => {
             let dtEvents: any[] = [];
             try { dtEvents = typeof mp.downtime_events === 'string' ? JSON.parse(mp.downtime_events) : (mp.downtime_events || []); } catch(e){}

             if (dtEvents && dtEvents.length > 0) {
               dtEvents.forEach((ev: any, idx: number) => {
                 const timeStr = mp.tanggal_jam ? (mp.tanggal_jam.includes("T") ? mp.tanggal_jam.split("T")[1].substring(0,5) : mp.tanggal_jam.split(" ")[1]?.substring(0,5)) : "-";
                 
                 if (ev.problems && ev.problems.length > 0) {
                   ev.problems.forEach((p: any, pIdx: number) => {
                     rows.push({
                       id: `${mp.id}-${idx}-${pIdx}`,
                       timeStr,
                       penanggungJawab: cleanPenanggungJawab(ev.dikerjakanOleh || mp.pic || mp.operators?.nama_operator),
                       shift: mp.grup || mp.groups?.nama_grup || ev.shift || "-",
                       durasiDisplay: formatDurationNice(ev.durasiDetik || mp.total_downtime_detik || 0),
                       kategori: p.kategori || ev.kategori || "-",
                       detailMasalah: (p.details && Array.isArray(p.details)) ? p.details.join(", ") : (p.details || ev.detail || "-"),
                     });
                   });
                 } else {
                   rows.push({
                     id: `${mp.id}-${idx}`,
                     timeStr,
                     penanggungJawab: cleanPenanggungJawab(ev.dikerjakanOleh || mp.pic || mp.operators?.nama_operator),
                     shift: mp.grup || mp.groups?.nama_grup || ev.shift || "-",
                     durasiDisplay: formatDurationNice(ev.durasiDetik || mp.total_downtime_detik || 0),
                     kategori: ev.kategori || "-",
                     detailMasalah: ev.detail || "-",
                   });
                 }
               });
             } else if (mp.downtime_records && mp.downtime_records.length > 0) {
               mp.downtime_records.forEach((dr: any, dIdx: number) => {
                 const timeStr = mp.tanggal_jam ? (mp.tanggal_jam.includes("T") ? mp.tanggal_jam.split("T")[1].substring(0,5) : mp.tanggal_jam.split(" ")[1]?.substring(0,5)) : "-";
                 rows.push({
                   id: `${mp.id}-dr-${dIdx}`,
                   timeStr,
                   penanggungJawab: cleanPenanggungJawab(dr.dikerjakan_oleh || mp.pic || mp.operators?.nama_operator),
                   shift: mp.grup || mp.groups?.nama_grup || "-",
                   durasiDisplay: formatDurationNice(dr.durasi_detik || mp.total_downtime_detik || 0),
                   kategori: dr.kategori || "-",
                   detailMasalah: dr.detail || "-",
                 });
               });
             } else if (mp.total_downtime_detik > 0) {
               const timeStr = mp.tanggal_jam ? (mp.tanggal_jam.includes("T") ? mp.tanggal_jam.split("T")[1].substring(0,5) : mp.tanggal_jam.split(" ")[1]?.substring(0,5)) : "-";
               rows.push({
                 id: `${mp.id}-fallback`,
                 timeStr,
                 penanggungJawab: cleanPenanggungJawab(mp.pic || mp.operators?.nama_operator),
                 shift: mp.grup || mp.groups?.nama_grup || "-",
                 durasiDisplay: formatDurationNice(mp.total_downtime_detik || 0),
                 kategori: mp.kategori_masalah || "-",
                 detailMasalah: mp.detail_masalah || "-",
               });
             }
           });

           if (rows.length === 0) return null;

           return (
             <div className="mt-8 rounded-2xl overflow-hidden shadow-md border border-slate-200">
               {/* Section Header */}
               <div
                 className="px-6 py-4 flex items-center gap-3"
                 style={{ background: "linear-gradient(135deg, #0a1628 0%, #0b3068 60%, #0070bc 100%)" }}
               >
                 <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                   <Wrench className="w-4.5 h-4.5 text-white" />
                 </div>
                 <div>
                   <h3 className="text-sm font-black text-white tracking-tight">
                     Laporan Downtime Khusus
                   </h3>
                   <p className="text-[10px] text-sky-200 font-semibold">
                     Mesin berhenti total — tanpa produksi
                   </p>
                 </div>
                 <div className="ml-auto bg-white/20 border border-white/30 rounded-full px-3 py-1 text-[10px] font-black text-white">
                   {rows.length} laporan
                 </div>
               </div>

               {/* Cards */}
               <div className="bg-slate-50/60 divide-y divide-slate-100">
                 {rows.map((row) => (
                   <div key={row.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-slate-50 transition-colors">
                     {/* Time */}
                     <div className="flex items-center gap-2 shrink-0 w-20">
                       <div className="w-2 h-2 rounded-full bg-[#0070bc] shrink-0" />
                       <span className="text-sm font-black text-slate-800">{row.timeStr}</span>
                     </div>

                     {/* Operator + Shift */}
                     <div className="flex items-center gap-2 flex-1 min-w-0">
                       <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 text-[10px] font-black text-[#0070bc]">
                         {row.penanggungJawab?.charAt(0)?.toUpperCase() || "?"}
                       </div>
                       <div className="min-w-0">
                         <div className="text-xs font-extrabold text-slate-800 truncate">{row.penanggungJawab}</div>
                         <div className="text-[10px] text-slate-500 font-semibold">Penanggung Jawab</div>
                       </div>
                       <span className="ml-2 shrink-0 bg-[#0070bc] text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                         Shift {row.shift}
                       </span>
                     </div>

                     {/* Duration */}
                     <div className="shrink-0">
                       <span className="bg-rose-50 border border-rose-200 text-rose-700 font-black text-xs px-3 py-1.5 rounded-lg inline-block">
                         ⏱ {row.durasiDisplay}
                       </span>
                     </div>

                     {/* Kategori + Detail */}
                     <div className="flex flex-col items-start sm:items-end gap-1 shrink-0 sm:min-w-[160px]">
                       <span className="bg-blue-50 border border-blue-200 text-[#0070bc] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide">
                         {row.kategori}
                       </span>
                       {row.detailMasalah !== "-" && (
                         <span className="text-[11px] text-slate-600 font-medium">{row.detailMasalah}</span>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           );
        })()}

      </div>
    </div>
  );
}

export default function HistoryDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[#0070bc] mb-4" />
        <span className="text-slate-500 font-medium">Memuat Halaman...</span>
      </div>
    }>
      <HistoryDetailContent />
    </Suspense>
  );
}

