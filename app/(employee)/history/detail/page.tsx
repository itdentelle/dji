"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { searchEmployeeHistory } from "@/actions/employee-actions";
import CompactHeaderCard from "@/components/forms/CompactHeaderCard";
import { Loader2, ArrowLeft, Clock, Edit, AlertCircle } from "lucide-react";
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
          date: tgl || undefined,
        });

        if (res.success && res.data && res.data.length > 0) {
          const batch = res.data.find(
            (b: any) =>
              b.nomor_mc === nomor_mc &&
              b.potongan_ke == potongan_ke &&
              (design_id ? b.design_id === design_id : true) &&
              (tgl ? b.tgl === tgl : true)
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
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/history")}
            className="w-10 h-10 shrink-0 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Detail Laporan Produksi
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-500">
              Menampilkan rincian batch untuk Mesin {detailData.nomor_mc} Potongan Ke-{detailData.potongan_ke}
            </p>
          </div>
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
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-800">
              Total Downtime: {detailData.total_downtime_detik} Detik
            </h4>
            <p className="text-xs text-amber-700 mt-1">
              Terdapat waktu tunggu (downtime) selama produksi batch ini berjalan.
            </p>
          </div>
        </div>
      )}

      {/* Laporan Produksi Table */}
      <div className="pb-4">
        {(() => {
          const isMeterReport = detailData.panels?.some((p: any) => p.panel_no === "METERAN");
          if (isMeterReport) return null;
          return (
            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              Rincian per Panel
            </h4>
          );
        })()}
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
               const totalPcs = parseInt(panel.pcs || "1");
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

            return (
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

