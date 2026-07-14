"use client";

import React from "react";
import Link from "next/link";
import { Edit } from "lucide-react";

export default function MeterHistoryTable({ panels, pcsKey }: { panels: any[]; pcsKey: string }) {
  const displayItems: any[] = [];
  let currentOpCount = 0;
  let globalRowCount = 0;
  let prevOperatorLastMeter: number | null = null;
  let currentOpStartMeter: number | null = null;
  let currentOpLastMeter: number | null = null;
  let lastOprString = "";

  panels.forEach((panel, idx) => {
    const rawDetails = panel.production_details || [];
    let pDetails: any[] = [];
    const seenDetails = new Set();
    rawDetails.forEach((d: any) => {
      const key = `${d.kategori_masalah || ''}_${d.detail_masalah || ''}_${d.keterangan_cacat || ''}`;
      if (!seenDetails.has(key)) { seenDetails.add(key); pDetails.push(d); }
    });
    const hasErrorDetail = pDetails.some((d: any) => d.kategori_masalah || d.keterangan_cacat);
    if (hasErrorDetail) { pDetails = pDetails.filter((d: any) => d.kategori_masalah || d.keterangan_cacat); }
    if (pDetails.length === 0) pDetails = [{ _isEmpty: true }];

    const opr = panel.operators?.nama_operator || panel.pic || panel.created_by_name || "";
    const grp = panel.groups?.nama_grup || "";
    const operatorStr = (grp ? `(${grp}) ` : '') + opr;

    if (displayItems.length === 0) {
      lastOprString = operatorStr;
    }

    let isSameAsPrev = false;

    if (operatorStr !== lastOprString && displayItems.length > 0) {
      let displayTotal = 0;
      if (currentOpStartMeter !== null && currentOpLastMeter !== null) {
        displayTotal = Math.abs(currentOpLastMeter - currentOpStartMeter);
      }

      displayItems.push({
        isSummaryRow: true,
        operatorName: lastOprString,
        totalCount: displayTotal,
        id: `summary-${idx}`
      });
      prevOperatorLastMeter = currentOpLastMeter;
      currentOpCount = 0;
      currentOpStartMeter = null;
      currentOpLastMeter = null;
      lastOprString = operatorStr;
      isSameAsPrev = false;
    } else if (displayItems.length > 0) {
      isSameAsPrev = true;
    }

    const cleanMeterVal = (val: any) => {
      if (val === null || val === undefined) return "";
      let str = String(val);
      str = str.replace(/PCS\s*\d+\s*:\s*/gi, "");
      str = str.replace(/[a-zA-Z]+$/g, "");
      return str.trim();
    };

    let cacatLines: string[] = [];
    let defectMeters: string[] = [];
    let isIstirahat = false;

    let dtEvents: any[] = [];
    try {
      if (typeof panel.downtime_events === 'string') {
        dtEvents = JSON.parse(panel.downtime_events);
      } else if (Array.isArray(panel.downtime_events)) {
        dtEvents = panel.downtime_events;
      }
    } catch (e) { }

    const matchedEvents = dtEvents.filter(
      (e: any) =>
        !e.pcsKe ||
        e.pcsKe === "Semua" ||
        e.pcsKe.split(",").map((x: any) => x.trim()).includes(pcsKey)
    );

    if (matchedEvents.length > 0) {
      matchedEvents.forEach((e:any) => {
        if (e.problems && Array.isArray(e.problems)) {
          e.problems.forEach((p:any) => {
            if (p.kategori) {
              if (p.meter) {
                const cleaned = cleanMeterVal(p.meter);
                if (cleaned) defectMeters.push(cleaned);
              }
              if (p.details && Array.isArray(p.details) && p.details.length > 0) {
                p.details.forEach((det: string) => {
                  let line = `${p.kategori} - ${det}`;
                  if (p.blok) {
                    line += ` (Blok ${p.blok})`;
                  }
                  cacatLines.push(line);
                });
              } else {
                let line = p.kategori;
                if (p.blok) {
                  line += ` (Blok ${p.blok})`;
                }
                cacatLines.push(line);
              }
            }
          });
        } else if (e.kategori) {
          if (e.meter) {
            const cleaned = cleanMeterVal(e.meter);
            if (cleaned) defectMeters.push(cleaned);
          }
          if (e.detail) {
            const dets = typeof e.detail === 'string' ? e.detail.split(',').map((x: string) => x.trim()) : [e.detail];
            dets.forEach((d: string) => {
              let line = `${e.kategori} - ${d}`;
              if (e.blok) line += ` (Blok ${e.blok})`;
              cacatLines.push(line);
            });
          } else {
            let line = e.kategori;
            if (e.blok) line += ` (Blok ${e.blok})`;
            cacatLines.push(line);
          }
        }
      });

      // Add QC tambahaan if exists
      const qcNotes = pDetails.filter((d:any) => !d._isEmpty && d.keterangan_cacat && d.keterangan_cacat.includes("TAMBAHAN QC"));
      qcNotes.forEach((qcNote: any) => {
        const parts = qcNote.keterangan_cacat.split("\n");
        const qcPart = parts.find((p: string) => p.includes("TAMBAHAN QC"));
        if (qcPart) cacatLines.push(`(${qcPart.trim()})`);
        else cacatLines.push(`(${qcNote.keterangan_cacat})`);
      });

      // Istirahat check
      const isIstirahatEvent = pDetails.some((d:any) => !d._isEmpty && d.keterangan_cacat && d.keterangan_cacat.toUpperCase().includes("ISTIRAHAT") && !d.kategori_masalah && !d.detail_masalah);
      if (isIstirahatEvent) isIstirahat = true;
    } else {
      const processFallback = () => {
        pDetails.forEach((det: any) => {
          if (!det._isEmpty) {
            if (det.meter_kain) {
              const cleaned = cleanMeterVal(det.meter_kain);
              if (cleaned) defectMeters.push(cleaned);
            }
            const katsRaw = det.kategori_masalah;
            const kats = katsRaw ? (Array.isArray(katsRaw) ? katsRaw : katsRaw.split(",").map((s: string) => s.trim())) : [];
            const displayDetail = det.detail_masalah || "";
            let currentLines: string[] = [];

            if (kats.length > 0) {
              if (displayDetail.includes(" | ")) {
                const catDetails = displayDetail.split(" | ");
                for (let i = 0; i < Math.max(kats.length, catDetails.length); i++) {
                  const k = kats[i] || "Unknown";
                  const d = catDetails[i] || "";
                  if (d) {
                    currentLines.push(`${k} - ${d}`);
                  } else {
                    currentLines.push(k);
                  }
                }
              } else if (displayDetail) {
                if (kats.length === 1) {
                  currentLines.push(`${kats[0]} - ${displayDetail}`);
                } else {
                  const dets = displayDetail.split(", ");
                  if (kats.length === dets.length) {
                    for (let i = 0; i < kats.length; i++) {
                      currentLines.push(`${kats[i]} - ${dets[i]}`);
                    }
                  } else {
                    currentLines.push(displayDetail);
                  }
                }
              } else {
                currentLines.push(kats.join(", "));
              }
            } else if (displayDetail) {
              currentLines.push(displayDetail);
            }

            let ketCacat = det.keterangan_cacat || "";
            const isIstirahatLine = ketCacat.toUpperCase().includes("ISTIRAHAT") && !det.kategori_masalah && !det.detail_masalah;

            if (isIstirahatLine) {
              isIstirahat = true;
            }
            
            ketCacat = ketCacat.replace(/\[?(SEBELUM|LAPORAN)?\s*ISTIRAHAT\]?/gi, "").trim();
            ketCacat = ketCacat.replace(/^,\s*|\s*,\s*$/g, "");

            const hasTambahanQC = ketCacat.includes("[TAMBAHAN QC]");
            ketCacat = ketCacat.replace(/\[TAMBAHAN QC\]/gi, "").trim();
            ketCacat = ketCacat.replace(/^,\s*|\s*,\s*$/g, "");

            if (ketCacat) {
              if (currentLines.length > 0) {
                const parts = ketCacat.split(",").map((s: string) => s.trim());
                currentLines = currentLines.map((line, i) => {
                  if (parts[i] && parts[i] !== "") {
                    const cleanB = parts[i].replace(/blok\s*/gi, "").trim();
                    return `${line} (Blok ${cleanB})`;
                  }
                  return line;
                });

                if (parts.length > currentLines.length) {
                  const remaining = parts.slice(currentLines.length).map((s: string) => s.replace(/blok\s*/gi, "").trim()).join(", ");
                  if (remaining) {
                    currentLines[currentLines.length - 1] += ` (Blok ${remaining})`;
                  }
                }
              } else {
                const cleanB = ketCacat.replace(/blok\s*/gi, "").trim();
                currentLines.push(`(Blok ${cleanB})`);
              }
            }

            if (hasTambahanQC) {
              if (currentLines.length === 0) {
                currentLines.push("[TAMBAHAN QC]");
              } else {
                for (let i = 0; i < currentLines.length; i++) {
                  currentLines[i] = currentLines[i] + " [TAMBAHAN QC]";
                }
              }
            }

            cacatLines.push(...currentLines);
          }
        });
      };
      processFallback();
    }

    cacatLines = Array.from(new Set(cacatLines));
    const uniqueMeters = Array.from(new Set(defectMeters)).filter(Boolean);
    const firstDetail = panel.production_details?.[0];
    const meterKain = firstDetail?.meter_kain;
    const isFinishReport = panel.meter_akhir !== null && panel.meter_akhir !== undefined && String(panel.meter_akhir).trim() !== "";
    const meterDisplay = uniqueMeters.length > 0
      ? uniqueMeters.join(", ")
      : (meterKain !== null && meterKain !== undefined
        ? cleanMeterVal(meterKain)
        : ((isIstirahat || isFinishReport) && (panel.meter_akhir || panel.meter_awal)
          ? cleanMeterVal(panel.meter_akhir || panel.meter_awal)
          : "-"));
    const combinedCacat = cacatLines.join("\n");

    if (!isSameAsPrev) {
      const startTglStr = (panel.tgl ? new Date(panel.tgl).toLocaleDateString('en-CA') : (panel.tanggal_jam ? new Date(panel.tanggal_jam).toISOString().split('T')[0] : "-"));
      const startMeter = prevOperatorLastMeter !== null
        ? String(prevOperatorLastMeter)
        : (panel.meter_awal !== undefined && panel.meter_awal !== null ? cleanMeterVal(panel.meter_awal) : "0");
      
      displayItems.push({
        id: `start-${idx}-${Math.random()}`,
        panel_no: (globalRowCount + 1).toString(),
        tglStr: startTglStr,
        grpStr: grp,
        oprStr: opr,
        meter_kain: startMeter,
        isError: false,
        cacat: "START",
        isIstirahat: false,
        db_id: null,
        isStartRow: true
      });
      currentOpCount += 1;
      globalRowCount += 1;
      const startMeterVal = parseFloat(cleanMeterVal(startMeter));
      if (!isNaN(startMeterVal)) {
        if (currentOpStartMeter === null) currentOpStartMeter = startMeterVal;
        currentOpLastMeter = startMeterVal;
      }
      isSameAsPrev = true;
    }

    let finalOprStr = isSameAsPrev ? "" : opr;
    let finalGrpStr = isSameAsPrev ? "" : grp;
    let finalTglStr = isSameAsPrev ? "" : (panel.tgl ? new Date(panel.tgl).toLocaleDateString('en-CA') : (panel.tanggal_jam ? new Date(panel.tanggal_jam).toISOString().split('T')[0] : "-"));

    const displayNo = (globalRowCount + 1).toString();
    const isPlaceholder = (matchedEvents.length === 0 && !hasErrorDetail && !isIstirahat && !isFinishReport) || (isIstirahat && meterDisplay === "-");

    if (!isPlaceholder) {
      displayItems.push({
        id: `${idx}-${Math.random()}`,
        panel_no: displayNo,
        tglStr: finalTglStr,
        grpStr: finalGrpStr,
        oprStr: finalOprStr,
        meter_kain: meterDisplay,
        isError: hasErrorDetail,
        cacat: isIstirahat ? "ISTIRAHAT" : (isFinishReport ? "FINISH" : (hasErrorDetail && combinedCacat ? combinedCacat : "-")),
        isIstirahat,
        db_id: panel.id
      });

      currentOpCount += 1;
      globalRowCount += 1;
      const meterVal = parseFloat(cleanMeterVal(meterDisplay));
      if (!isNaN(meterVal)) {
        if (currentOpStartMeter === null) currentOpStartMeter = meterVal;
        currentOpLastMeter = meterVal;
      }
    }

    if (idx === panels.length - 1) {
      let displayTotal = 0;
      if (currentOpStartMeter !== null && currentOpLastMeter !== null) {
        displayTotal = Math.abs(currentOpLastMeter - currentOpStartMeter);
      }

      displayItems.push({
        isSummaryRow: true,
        operatorName: operatorStr,
        totalCount: displayTotal,
        id: `summary-end`
      });
    }
  });

  return (
    <table className="text-left text-xs border-collapse w-full">
      <thead>
        <tr className="bg-slate-50">
          <th className="px-3 py-2 border-b border-r border-slate-200 font-extrabold text-slate-600 w-12 text-center">NO</th>
          <th className="px-3 py-2 border-b border-r border-slate-200 font-extrabold text-slate-600 w-24">TGL</th>
          <th className="px-3 py-2 border-b border-r border-slate-200 font-extrabold text-slate-600 w-16 text-center">Group</th>
          <th className="px-3 py-2 border-b border-r border-slate-200 font-extrabold text-slate-600 w-24">Operator</th>
          <th className="px-3 py-2 border-b border-r border-slate-200 font-extrabold text-slate-600 w-16 text-center">Meter</th>
          <th className="px-3 py-2 border-b border-r border-slate-200 font-extrabold text-slate-600 w-12 text-center">KET ✓/X</th>
          <th className="px-3 py-2 border-b border-r border-slate-200 font-extrabold text-slate-600">KETERANGAN CACAT</th>
          <th className="px-3 py-2 border-b border-slate-200 font-extrabold text-slate-600 w-12 text-center">AKSI</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 text-xs">
        {displayItems.length > 0 ? displayItems.map((item) => {
          if (item.isSummaryRow) {
            return (
              <tr key={item.id} className="bg-slate-100 font-semibold text-slate-700">
                <td colSpan={5} className="px-3 py-2 text-right whitespace-nowrap">Total Produksi {item.operatorName}:</td>
                <td className="px-3 py-2 text-center text-slate-800 font-bold whitespace-nowrap">
                  {item.totalCount} Meter
                </td>
                <td colSpan={2} className="bg-slate-100"></td>
              </tr>
            );
          }

          return (
            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2 border-r border-slate-100 font-bold text-slate-800 text-center align-top">{item.panel_no}</td>
              <td className="px-3 py-2 border-r border-slate-100 text-slate-600 whitespace-nowrap align-top">{item.tglStr}</td>
              <td className="px-3 py-2 border-r border-slate-100 font-medium text-slate-700 text-center align-top">{item.grpStr}</td>
              <td className="px-3 py-2 border-r border-slate-100 font-medium text-slate-700 align-top">{item.oprStr}</td>
              <td className="px-3 py-2 border-r border-slate-100 text-slate-600 text-center align-top">{item.meter_kain || "-"}</td>
              <td className={`px-3 py-2 border-r border-slate-100 text-center font-bold ${(item.isStartRow || item.isIstirahat || item.cacat === "FINISH") ? "" : (item.cacat !== "-" ? "text-red-600" : "text-emerald-600")} align-top`}>
                {(item.isStartRow || item.isIstirahat || item.cacat === "FINISH") ? "" : (item.cacat !== "-" ? "X" : "✓")}
              </td>
              <td className={`px-3 py-2 border-r border-slate-100 whitespace-pre overflow-x-auto max-w-xs align-top ${(item.isError && !item.isIstirahat && item.cacat !== "FINISH") ? 'text-red-600' : 'text-slate-700'}`}>{item.cacat}</td>
              <td className="px-3 py-2 text-center align-top">
                {item.db_id && !item.isIstirahat && item.cacat !== "FINISH" && (
                  <Link href={`/edit/${item.db_id}`} className="inline-flex items-center justify-center p-1.5 rounded hover:bg-sky-100 text-[#0070bc] transition-colors" title="Edit Data">
                    <Edit className="w-3.5 h-3.5" />
                  </Link>
                )}
              </td>
            </tr>
          );
        }) : (
          <tr>
            <td colSpan={8} className="px-3 py-4 text-center text-slate-400">Belum ada baris</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
