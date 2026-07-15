"use client";

import React from "react";
import Link from "next/link";
import { Edit, CheckCircle2, XCircle } from "lucide-react";
import { PROBLEM_DETAILS } from "@/app/qc/page";

const cleanMeterVal = (val: any) => {
  if (val === null || val === undefined) return "";
  const str = String(val);
  const clean = str.replace(/PCS\s*\d+\s*:\s*/gi, "");
  return clean.replace(/[a-zA-Z\s]+$/g, "").trim();
};

export default function MeterHistoryTable({
  panels,
  pcsKey
}: {
  panels: any[];
  pcsKey: string;
}) {
  const header = panels[0] || {};

  const detailsToDisplay = React.useMemo(() => {
    const list: any[] = [];
    panels.forEach((p: any) => {
      const details = p.production_details || [];
      if (details.length === 0) {
        list.push({
          production_headers: p,
          final_inspection_id: p.final_inspection_id || 1,
        });
      } else {
        details.forEach((d: any) => {
          list.push({
            ...d,
            production_headers: p,
            final_inspection_id: d.final_inspection_id ?? p.final_inspection_id ?? 1,
          });
        });
      }
    });
    return list;
  }, [panels]);

  const displayItems = React.useMemo(() => {
    const filtered = detailsToDisplay.filter((item: any) => {
      const h = item.production_headers || {};
      const isIstirahat = (item.keterangan_cacat || "").toUpperCase().includes("ISTIRAHAT") && !item.kategori_masalah && !item.detail_masalah;
      const isFinishReport = h.meter_akhir !== null && h.meter_akhir !== undefined && String(h.meter_akhir).trim() !== "";
      const hasDefect = !!item.kategori_masalah || !!item.detail_masalah || (item.keterangan_cacat && item.keterangan_cacat !== "START" && item.keterangan_cacat !== "FINISH" && !isIstirahat);

      if (!isIstirahat && !isFinishReport && !hasDefect && (item.meter_kain === null || item.meter_kain === undefined || String(item.meter_kain).trim() === "")) {
        return false;
      }

      if (!isIstirahat) return true;
      const hasMeter = (item.meter_kain !== null && item.meter_kain !== undefined && String(item.meter_kain).trim() !== "") ||
                       (h.meter_akhir !== null && h.meter_akhir !== undefined && String(h.meter_akhir).trim() !== "") ||
                       (h.meter_awal !== null && h.meter_awal !== undefined && String(h.meter_awal).trim() !== "");
      return hasMeter;
    });

    const processed = filtered.map((item: any) => {
      const h = item.production_headers || {};
      const opr = h.operators?.nama_operator || h.pic || "";
      const grp = h.groups?.nama_grup || "";
      const tgl = h.tgl || "";
      const operatorStr = (grp ? `(${grp}) ` : '') + opr;

      const isIstirahat = (item.keterangan_cacat || "").toUpperCase().includes("ISTIRAHAT") && !item.kategori_masalah && !item.detail_masalah;
      const isFinish = item.keterangan_cacat === "FINISH" || item.production_headers?.panel_no === "FINISH" || item.production_headers?.meter_akhir;
      const isStart = item.keterangan_cacat === "START" || item.production_headers?.panel_no === "START";
      const isGradable = !isIstirahat && !isFinish && !isStart;

      return {
        item,
        isIstirahat,
        isGradable,
        opr,
        grp,
        tgl,
        operatorStr,
      };
    });

    const items: any[] = [];
    let currentOpStartMeter: number | null = null;
    let currentOpLastMeter: number | null = null;
    let prevOperatorLastMeter: number | null = null;
    let globalRowCount = 0;
    let isSameAsPrev = false;
    let lastOprString = "";

    processed.forEach((p: any, idx: number) => {
      const { item, isIstirahat, isGradable, opr, grp, tgl, operatorStr } = p;
      const h = item.production_headers || {};

      let cleanD = item.detail_masalah || "";
      const meterMatchForClean = cleanD.match(/\(Titik:\s*([A-Za-z0-9\s.\-]+)\)/i);
      if (meterMatchForClean && meterMatchForClean[0]) {
        cleanD = cleanD.replace(meterMatchForClean[0], "").trim();
      }

      let cacatLines: string[] = [];
      const katsRaw = item.kategori_masalah;
      const kats = katsRaw ? (Array.isArray(katsRaw) ? katsRaw : katsRaw.split(",").map((s: string) => s.trim())) : [];
      
      const pushDetailsForCat = (k: string, d: string) => {
        if (!d) {
          cacatLines.push(k);
          return;
        }
        const knownDetailsForCat = PROBLEM_DETAILS[k] || [];
        const matchedDetails: string[] = [];
        let remainingD = d;
        const sortedKnown = [...knownDetailsForCat].sort((a, b) => b.length - a.length);
        sortedKnown.forEach(known => {
          if (remainingD.includes(known)) {
            matchedDetails.push(known);
            remainingD = remainingD.replace(known, "");
          }
        });
        if (matchedDetails.length > 0) {
          const customParts = remainingD.split(",").map((s: string) => s.trim()).filter(Boolean);
          matchedDetails.forEach(match => cacatLines.push(`${k} - ${match}`));
          customParts.forEach(custom => {
            const cleanCustom = custom.replace(/^,\s*|\s*,\s*$/g, "").trim();
            if (cleanCustom) cacatLines.push(`${k} - ${cleanCustom}`);
          });
        } else {
          const parts = d.split(",").map((s: string) => s.trim()).filter(Boolean);
          parts.forEach(p => cacatLines.push(`${k} - ${p}`));
        }
      };

      if (kats.length > 0) {
        if (cleanD?.includes(" | ")) {
          const catDetails = cleanD.split(" | ");
          for (let i = 0; i < Math.max(kats.length, catDetails.length); i++) {
            const k = kats[i] || "Unknown";
            const d = catDetails[i] || "";
            pushDetailsForCat(k, d);
          }
        } else if (cleanD) {
          if (kats.length === 1) {
            pushDetailsForCat(kats[0], cleanD);
          } else {
            const dets = cleanD.split(", ");
            if (kats.length === dets.length) {
              for (let i = 0; i < kats.length; i++) {
                pushDetailsForCat(kats[i], dets[i]);
              }
            } else {
              dets.forEach((det: string) => {
                let foundKat = "Unknown";
                for (const [kat, detList] of Object.entries(PROBLEM_DETAILS || {})) {
                  if ((detList as string[]).some((d: string) => det.toLowerCase().includes(d.toLowerCase()))) {
                    foundKat = kat;
                    break;
                  }
                }
                cacatLines.push(`${foundKat !== "Unknown" ? foundKat + " - " : ""}${det}`);
              });
            }
          }
        } else {
          cacatLines.push(kats.join(", "));
        }
      } else if (cleanD) {
        cacatLines.push(cleanD);
      }

      let ketCacat = item.keterangan_cacat || "";
      const hasTambahanQC = ketCacat.includes("[TAMBAHAN QC]");
      ketCacat = ketCacat.replace(/\[?(SEBELUM|LAPORAN)?\s*ISTIRAHAT\]?/gi, "").trim();
      ketCacat = ketCacat.replace(/\[TAMBAHAN QC\]/gi, "").trim();
      ketCacat = ketCacat.replace(/^,\s*|\s*,\s*$/g, "");

      if (ketCacat) {
        if (cacatLines.length > 0) {
          const parts = ketCacat.split(",").map((s: string) => s.trim());
          cacatLines = cacatLines.map((line, i) => {
            const lineKat = line.includes(" - ") ? line.split(" - ")[0].trim() : "";
            let partIndex = i;
            if (lineKat && kats.includes(lineKat)) {
              partIndex = kats.indexOf(lineKat);
            }
            if (parts[partIndex] && parts[partIndex] !== "") {
              const cleanB = parts[partIndex].replace(/blok\s*/gi, "").trim();
              return `${line} (Blok ${cleanB})`;
            } else if (parts[parts.length - 1] && parts[parts.length - 1] !== "") {
              const cleanB = parts[parts.length - 1].replace(/blok\s*/gi, "").trim();
              return `${line} (Blok ${cleanB})`;
            }
            return line;
          });
        } else {
          const cleanB = ketCacat.replace(/blok\s*/gi, "").trim();
          cacatLines.push(`(Blok ${cleanB})`);
        }
      }

      if (hasTambahanQC) {
        if (cacatLines.length === 0) {
          cacatLines.push("[TAMBAHAN QC]");
        } else {
          cacatLines = cacatLines.map(line => line + " [TAMBAHAN QC]");
        }
      }

      const isFinishReport = h.meter_akhir !== null && h.meter_akhir !== undefined && String(h.meter_akhir).trim() !== "";
      const isStartRow = item.keterangan_cacat === "START" || (!item.kategori_masalah && !item.detail_masalah && item.meter_kain === 0 && !isIstirahat);

      let meterDisplay = "-";
      if (item.meter_kain !== null && item.meter_kain !== undefined && String(item.meter_kain).trim() !== "") {
        meterDisplay = cleanMeterVal(item.meter_kain);
      } else if (item.detail_masalah) {
        const meterMatch = item.detail_masalah.match(/\(Titik:\s*([A-Za-z0-9\s.\-]+)\)/i);
        if (meterMatch && meterMatch[1]) {
          meterDisplay = cleanMeterVal(meterMatch[1]);
        }
      }
      
      if (meterDisplay === "-") {
        if ((isIstirahat || isFinishReport) && (h.meter_akhir || h.meter_awal)) {
          meterDisplay = cleanMeterVal(h.meter_akhir || h.meter_awal);
        }
      }

      if (idx === 0) {
        lastOprString = operatorStr;
      }

      if (operatorStr !== lastOprString && items.length > 0) {
        const totalMeter = currentOpLastMeter !== null && currentOpStartMeter !== null
          ? Math.abs(currentOpLastMeter - currentOpStartMeter)
          : null;

        const [prevGrp, prevOpr] = lastOprString.includes(") ") 
          ? [lastOprString.match(/\(([^)]+)\)/)?.[1] || "", lastOprString.replace(/^\([^)]+\)\s*/, "")]
          : ["", lastOprString];

        items.push({
          id: `total-${lastOprString}-${Math.random()}`,
          isTotalRow: true,
          totalLabel: `Total Produksi${prevGrp ? ` (${prevGrp})` : ""} ${prevOpr}:`,
          totalMeter: totalMeter !== null ? `${totalMeter} Meter` : "-",
        });
        prevOperatorLastMeter = currentOpLastMeter;
        currentOpStartMeter = null;
        currentOpLastMeter = null;
        lastOprString = operatorStr;
        isSameAsPrev = false;
      } else if (items.length > 0) {
        isSameAsPrev = true;
      }

      if (!isSameAsPrev) {
        const startTglStr = h.tgl || "-";
        const startMeter = prevOperatorLastMeter !== null
          ? String(prevOperatorLastMeter)
          : (h.meter_awal !== undefined && h.meter_awal !== null ? cleanMeterVal(h.meter_awal) : "0");

        items.push({
          id: `start-${idx}-${Math.random()}`,
          isStartRow: true,
          isMeter: true,
          displayNo: (globalRowCount + 1).toString(),
          tglStr: startTglStr,
          grpStr: grp,
          oprStr: opr,
          meterDisplay: startMeter,
          cacatDisplay: "START",
          isGradable: false,
          showTgl: true,
          showGrp: true,
          showOpr: true,
          hasErrorDetail: false
        });
        globalRowCount += 1;
        const startMeterVal = parseFloat(cleanMeterVal(startMeter));
        if (!isNaN(startMeterVal)) {
          if (currentOpStartMeter === null) currentOpStartMeter = startMeterVal;
          currentOpLastMeter = startMeterVal;
        }
        isSameAsPrev = true;
      }

      const meterVal = parseFloat(meterDisplay);
      if (!isNaN(meterVal)) {
        if (currentOpStartMeter === null) currentOpStartMeter = meterVal;
        currentOpLastMeter = meterVal;
      }

      let showTgl = true;
      let showGrp = true;
      let showOpr = true;

      let prevTgl = "";
      let prevGrp = "";
      let prevOpr = "";

      for (let k = items.length - 1; k >= 0; k--) {
        const pItem = items[k];
        if (!pItem.isTotalRow) {
          prevTgl = pItem.tglStr;
          prevGrp = pItem.grpStr;
          prevOpr = pItem.oprStr;
          break;
        }
      }

      if (tgl === prevTgl) showTgl = false;
      if (grp === prevGrp) showGrp = false;
      if (opr === prevOpr) showOpr = false;

      const cleanedCacatLines = cacatLines
        .map((line: string) => line.replace(/\s*\(Titik:\s*[A-Za-z0-9\s.\-]+\)/gi, "").trim())
        .filter(Boolean);

      let cacatText = isStartRow ? "START" : (isFinishReport ? "FINISH" : (isIstirahat ? "ISTIRAHAT" : (cleanedCacatLines.join("\n") || "-")));
      if (isIstirahat) {
        showTgl = false;
        showGrp = false;
        showOpr = true;
        cacatText = "ISTIRAHAT";
      }

      const hasErrorDetail = !!item.kategori_masalah || !!item.detail_masalah;

      items.push({
        id: item.id || `item-${idx}-${Math.random()}`,
        isStartRow: false,
        isMeter: true,
        displayNo: (globalRowCount + 1).toString(),
        tglStr: tgl,
        grpStr: grp,
        oprStr: opr,
        meterDisplay,
        cacatDisplay: cacatText,
        isGradable,
        showTgl,
        showGrp,
        showOpr: isIstirahat ? true : showOpr,
        hasErrorDetail,
        isIstirahat,
        db_id: item.id,
        header_id: h.id
      });
      globalRowCount += 1;
    });

    if (items.length > 0 && currentOpStartMeter !== null && currentOpLastMeter !== null) {
      const totalMeter = Math.abs(currentOpLastMeter - currentOpStartMeter);
      const [lastGrp, lastOprOnly] = lastOprString.includes(") ") 
        ? [lastOprString.match(/\(([^)]+)\)/)?.[1] || "", lastOprString.replace(/^\([^)]+\)\s*/, "")]
        : ["", lastOprString];
      items.push({
        id: `total-last-${lastOprString}-${Math.random()}`,
        isTotalRow: true,
        totalLabel: `Total Produksi${lastGrp ? ` (${lastGrp})` : ""} ${lastOprOnly}:`,
        totalMeter: `${totalMeter} Meter`,
      });
    }

    return items;
  }, [detailsToDisplay, panels]);

  return (
    <table className="w-full text-left border-collapse text-xs">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
          <th className="px-1 py-2 w-8 text-center border-r border-slate-100">NO</th>
          <th className="px-1 py-2 w-20 border-r border-slate-100">TGL</th>
          <th className="px-1 py-2 w-10 text-center border-r border-slate-100">Group</th>
          <th className="px-1 py-2 w-24 border-r border-slate-100">Operator</th>
          <th className="px-1 py-2 text-center w-12 border-r border-slate-100">METER</th>
          <th className="px-1 py-2 text-center w-12 border-r border-slate-100">KET ✓/X</th>
          <th className="px-2 py-2 min-w-[250px] w-full border-r border-slate-100">KETERANGAN CACAT</th>
          <th className="px-1 py-2 text-center w-12">AKSI</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
        {displayItems.map((item: any, index: number) => {
          if (item.isTotalRow) {
            return (
              <tr key={item.id || index} className="bg-slate-100 border-t-2 border-b-2 border-slate-300">
                <td colSpan={8} className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
                  {item.totalLabel} <span className="font-extrabold text-slate-800 ml-1">{item.totalMeter}</span>
                </td>
              </tr>
            );
          }

          if (item.isStartRow) {
            return (
              <tr key={item.id || index} className="hover:bg-slate-50 transition-colors">
                <td className="px-1 py-1.5 font-bold text-slate-800 text-center text-xs w-7 border-r border-slate-100 border-b border-slate-100">
                  {item.displayNo}
                </td>
                <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap text-xs w-24 border-r border-slate-100 border-b border-slate-100">
                  {item.tglStr}
                </td>
                <td className="px-1 py-1.5 font-medium text-slate-700 text-center text-xs w-12 border-r border-slate-100 border-b border-slate-100">
                  {item.grpStr}
                </td>
                <td className="px-2 py-1.5 font-medium text-slate-700 leading-tight text-xs w-28 border-r border-slate-100 border-b border-slate-100">
                  {item.oprStr}
                </td>
                <td className="px-1 py-1.5 text-center font-bold text-slate-800 text-xs w-14 border-r border-slate-100 border-b border-slate-100">
                  {item.meterDisplay}
                </td>
                <td className="px-1 py-1.5 text-center font-bold text-sm w-14 border-r border-slate-100 border-b border-slate-100">
                  {/* Empty KET for START */}
                </td>
                <td className="px-3 py-1.5 text-[11px] font-medium text-slate-400 whitespace-pre leading-tight border-r border-slate-100 border-b border-slate-100">
                  START
                </td>
                <td className="px-1 py-1.5 text-center w-24 border-r border-slate-100 border-b border-slate-100">
                  {/* Empty AKSI for START */}
                </td>
              </tr>
            );
          }

          const hasMeterDefect = item.cacatDisplay && item.cacatDisplay !== "-" && item.cacatDisplay !== "START" && item.cacatDisplay !== "FINISH" && item.cacatDisplay !== "ISTIRAHAT";
          const meterCacatColor = item.isIstirahat || item.cacatDisplay === "ISTIRAHAT" || item.cacatDisplay === "FINISH"
            ? "text-slate-600 font-semibold italic"
            : (hasMeterDefect ? "text-rose-600" : "text-slate-400");

          return (
            <tr key={item.id || index} className={`${item.isIstirahat ? "bg-amber-50/30" : "hover:bg-slate-50"} transition-colors`}>
              <td className="px-1 py-1.5 font-bold text-slate-800 text-center text-xs w-7 border-r border-slate-100 border-b border-slate-100">
                {item.displayNo}
              </td>
              <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap text-xs w-24 border-r border-slate-100 border-b border-slate-100">
                {item.isIstirahat ? "" : (item.showTgl ? item.tglStr : "")}
              </td>
              <td className="px-1 py-1.5 font-medium text-slate-700 text-center text-xs w-12 border-r border-slate-100 border-b border-slate-100">
                {item.isIstirahat ? "" : (item.showGrp ? item.grpStr : "")}
              </td>
              <td className={`px-2 py-1.5 leading-tight text-xs w-28 border-r border-slate-100 border-b border-slate-100 ${item.isIstirahat ? "text-slate-500 italic font-bold" : "font-medium text-slate-700"}`}>
                {item.isIstirahat ? "Istirahat" : (item.showOpr ? item.oprStr : "")}
              </td>
              <td className="px-1 py-1.5 text-center font-bold text-slate-800 text-xs w-14 border-r border-slate-100 border-b border-slate-100">
                {item.meterDisplay}
              </td>
               <td className="px-1 py-1.5 text-center w-14 border-r border-slate-100 border-b border-slate-100">
                 {(() => {
                   if (item.isStartRow || item.cacatDisplay === "START") return null;
                   if (item.isIstirahat || item.cacatDisplay === "ISTIRAHAT" || item.cacatDisplay === "FINISH") {
                     return null;
                   }
                   if (hasMeterDefect) {
                     return <XCircle className="w-4 h-4 text-rose-500 inline-block" />;
                   }
                   return <CheckCircle2 className="w-4 h-4 text-emerald-500 inline-block" />;
                 })()}
               </td>
               <td className={`px-3 py-1.5 text-[11px] font-medium whitespace-pre leading-tight border-r border-slate-100 border-b border-slate-100 ${meterCacatColor}`}>
                 {item.cacatDisplay}
               </td>
               <td className="px-1 py-1.5 text-center w-12 border-b border-slate-100">
                 {hasMeterDefect && item.header_id && (
                   <Link
                     href={`/edit/${item.header_id}`}
                     className="inline-flex items-center justify-center p-1.5 rounded hover:bg-sky-100 text-[#0070bc] transition-colors"
                     title="Edit Data"
                   >
                     <Edit className="w-3.5 h-3.5" />
                   </Link>
                 )}
               </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
