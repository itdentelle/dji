"use client";

import React from "react";
import { Eye, Trash2, CheckCircle, X } from "lucide-react";
import { PROBLEM_DETAILS } from "../page";

export default function PanelQCTable({
  detailsToDisplay,
  handleSelectGrade,
  handleOpenDetail,
  selections,
  setDetailToDelete
}: {
  detailsToDisplay: any[];
  handleSelectGrade: (id: string, grade: number) => void;
  handleOpenDetail: (headerId: string) => void;
  selections: Record<string, number>;
  setDetailToDelete: (val: any) => void;
}) {
  const displayItems = React.useMemo(() => {
    const items: any[] = [];
    
    // Step 1: Pre-process items to identify operators and Istirahat
    const processed = detailsToDisplay.map((item) => {
      const h = item.production_headers || {};
      const opr = h.operators?.nama_operator || h.pic || h.created_by_name || "";
      const grp = h.groups?.nama_grup || "";
      const tgl = h.tgl || "";
      const operatorStr = (grp ? `(${grp}) ` : '') + opr;

      const isIstirahat = (!!item.keterangan_cacat?.toUpperCase().includes("ISTIRAHAT") || 
                           !!item.kategori_masalah?.toUpperCase().includes("ISTIRAHAT")) && 
                          !item.kategori_masalah && !item.detail_masalah;

      return {
        item,
        isIstirahat,
        opr,
        grp,
        tgl,
        operatorStr,
      };
    });

    // Step 2: Build the final list with total rows
    let currentOpCount = 0;
    let lastTgl = "";
    let lastGrp = "";
    let lastOpr = "";

    processed.forEach((p, i) => {
      const { item, isIstirahat, opr, grp, tgl, operatorStr } = p;

      currentOpCount += 1;

      let showTgl = true;
      let showGrp = true;
      let showOpr = true;

      if (tgl === lastTgl) showTgl = false;
      if (grp === lastGrp) showGrp = false;
      if (opr === lastOpr) showOpr = false;

      lastTgl = tgl;
      lastGrp = grp;
      lastOpr = opr;

      items.push({
        ...item,
        isMeter: false,
        isStartRow: false,
        isIstirahat: isIstirahat,
        isFinishReport: false,
        displayNo: item.production_headers?.panel_no || "-",
        meterDisplay: "-",
        cacatDisplay: item.detail_masalah || item.keterangan_cacat || "-",
        isGradable: true,
        showTgl,
        showGrp,
        showOpr,
        hasErrorDetail: !!item.kategori_masalah || !!item.detail_masalah
      });

      // Check if it's the last row in this operator's contiguous session
      let nextOprStr = null;
      if (i + 1 < processed.length) {
        nextOprStr = processed[i + 1].operatorStr;
      }

      if (nextOprStr === null || nextOprStr !== operatorStr) {
        // Push total row
        const [prevGrp, prevOpr] = operatorStr.includes(") ") 
          ? [operatorStr.match(/\(([^)]+)\)/)?.[1] || "", operatorStr.replace(/^\([^)]+\)\s*/, "")]
          : ["", operatorStr];

        items.push({
          id: `total-${operatorStr}-${Math.random()}`,
          isTotalRow: true,
          totalLabel: `Total Produksi (${prevGrp}) ${prevOpr}:`,
          totalCount: currentOpCount
        });
        currentOpCount = 0;
      }
    });

    return items;
  }, [detailsToDisplay]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
            <th className="px-1 py-2 w-8 text-center">PNL</th>
            <th className="px-1 py-2 w-20">Tgl</th>
            <th className="px-1 py-2 w-10 text-center">Group</th>
            <th className="px-1 py-2 w-24">Operator</th>
            <th className="px-1 py-2 text-center w-12">KET ✓/X</th>
            <th className="px-2 py-2 min-w-[250px] w-full">KETERANGAN CACAT</th>
            <th className="px-1 py-2 text-center w-16">AKSI</th>
            <th className="px-0.5 py-2 text-center text-emerald-600 font-black w-6">✓</th>
            <th className="px-0.5 py-2 text-center text-rose-600 font-black w-6">X</th>
            <th className="px-0.5 py-2 text-center text-rose-600 font-black w-6">BS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
          {displayItems.map((item, index) => {
            if (item.isTotalRow) {
              return (
                <tr key={item.id} className="bg-slate-100 border-t border-b border-slate-200 font-semibold text-slate-700">
                  <td colSpan={4} className="px-3 py-2 text-right whitespace-nowrap animate-fadeIn">
                    {item.totalLabel}
                  </td>
                  <td className="px-1 py-2 text-center text-slate-800 font-extrabold whitespace-nowrap animate-fadeIn">
                    {item.totalCount}
                  </td>
                  <td colSpan={5} className="bg-slate-100"></td>
                </tr>
              );
            }

            let showTgl = item.showTgl;
            let showGrp = item.showGrp;
            let showOpr = item.showOpr;
            const tglStr = item.production_headers?.tgl || "-";
            const grpStr = item.production_headers?.groups?.nama_grup || "-";
            
            let oprStr = item.production_headers?.operators?.nama_operator || item.production_headers?.pic || "-";
            let displayKeterangan = item.keterangan_cacat || "";
            let displayDetail = item.detail_masalah || "";
            
            let isIstirahat = false;
            if (displayKeterangan.includes("ISTIRAHAT") && !item.kategori_masalah && !item.detail_masalah) {
              isIstirahat = true;
              displayKeterangan = displayKeterangan.replace(/\[?(SEBELUM|LAPORAN)?\s*ISTIRAHAT\]?/gi, "").trim();
              displayKeterangan = displayKeterangan.replace(/^,\s*|\s*,\s*$/g, "");
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
                customParts.forEach(custom => cacatLines.push(`${k} - ${custom}`));
              } else {
                const parts = d.split(",").map((s: string) => s.trim()).filter(Boolean);
                parts.forEach(p => cacatLines.push(`${k} - ${p}`));
              }
            };
            
            if (kats.length > 0) {
              if (displayDetail.includes(" | ")) {
                const catDetails = displayDetail.split(" | ");
                for (let i = 0; i < Math.max(kats.length, catDetails.length); i++) {
                  const k = kats[i] || "Unknown";
                  const d = catDetails[i] || "";
                  pushDetailsForCat(k, d);
                }
              } else if (displayDetail) {
                if (kats.length === 1) {
                  pushDetailsForCat(kats[0], displayDetail);
                } else {
                  const dets = displayDetail.split(", ");
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
            } else if (displayDetail) {
              cacatLines.push(displayDetail);
            }
            
            let ketCacat = displayKeterangan;
            const hasTambahanQC = ketCacat.includes("[TAMBAHAN QC]");
            ketCacat = ketCacat.replace(/\[?(SEBELUM|LAPORAN)?\s*ISTIRAHAT\]?/gi, "").trim();
            ketCacat = ketCacat.replace(/\[TAMBAHAN QC\]/gi, "").trim();
            ketCacat = ketCacat.replace(/^,\s*|\s*,\s*$/g, "");

            if (ketCacat) {
              if (cacatLines.length > 0) {
                const parts = ketCacat.split(",").map((s: string) => s.trim());
                
                cacatLines = cacatLines.map((line: string, i: number) => {
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
                for (let i = 0; i < cacatLines.length; i++) {
                  cacatLines[i] = cacatLines[i] + " [TAMBAHAN QC]";
                }
              }
            }
            
            let cacat = cacatLines.join("\n");

            return (
            <tr key={item.id} className={`${isIstirahat ? "bg-amber-50/30" : "hover:bg-slate-50"} transition-colors`}>
              <td className="px-1 py-1 font-bold text-slate-800 text-center">
                {item.production_headers?.panel_no || "-"}
              </td>
              <td className="px-1 py-1 text-slate-600 whitespace-nowrap">
                {showTgl ? tglStr : ""}
              </td>
              <td className="px-1 py-1 font-medium text-slate-700 text-center">
                {showGrp ? grpStr : ""}
              </td>
              <td className={`px-1 py-1 leading-tight ${isIstirahat ? "text-slate-500 italic font-bold" : "text-slate-700 font-medium"}`}>
                {isIstirahat ? "Istirahat" : (showOpr ? oprStr : "")}
              </td>
              <td className="px-1 py-1 text-center font-bold text-sm">
                {item.indikator_stop || item.kategori_masalah ? <span className="text-rose-600">X</span> : <span className="text-emerald-600">✓</span>}
              </td>
              
              <td className={`px-2 py-1 text-[11px] font-medium whitespace-pre leading-tight ${isIstirahat ? 'text-slate-500 italic' : 'text-rose-600'}`}>
                {cacat || "-"}
              </td>
              
              <td className="px-1 py-1">
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => handleOpenDetail(item.header_id)}
                    className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-[#0070bc] hover:border-[#0070bc]/30 transition-all shadow-sm group"
                    title="Lihat Detail Produksi"
                  >
                    <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  </button>
                  <button
                    onClick={() => setDetailToDelete({ id: item.id, name: `${item.kategori_masalah || 'Masalah'} - ${item.detail_masalah || 'Tidak ada detail'}` })}
                    className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 transition-all shadow-sm"
                    title="Hapus Rincian"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>

              <td className="px-1 py-1 text-center">
                <button
                  onClick={() => handleSelectGrade(item.id, 1)}
                  className={`w-6 h-6 mx-auto flex items-center justify-center rounded-md transition-all border ${selections[item.id] === 1 ? "border-emerald-500 bg-emerald-100 text-emerald-700 shadow-sm" : "border-slate-200 bg-white text-slate-300 hover:border-emerald-300 hover:text-emerald-500"}`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                </button>
              </td>
              <td className="px-1 py-1 text-center">
                <button
                  onClick={() => handleSelectGrade(item.id, 3)}
                  className={`w-6 h-6 mx-auto flex items-center justify-center rounded-md transition-all border ${selections[item.id] === 3 ? "border-rose-500 bg-rose-100 text-rose-700 shadow-sm" : "border-slate-200 bg-white text-slate-300 hover:border-rose-300 hover:text-rose-500"}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </td>
              <td className="px-1 py-1 text-center">
                <button
                  onClick={() => handleSelectGrade(item.id, 4)}
                  className={`w-6 h-6 mx-auto flex items-center justify-center rounded-md transition-all border ${selections[item.id] === 4 ? "border-rose-500 bg-rose-100 text-rose-700 shadow-sm" : "border-slate-200 bg-white text-slate-300 hover:border-rose-300 hover:text-rose-500"}`}
                >
                  <span className="text-[10px] font-black">BS</span>
                </button>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
