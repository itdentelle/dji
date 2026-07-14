"use client";

import React from "react";
import Link from "next/link";
import { Edit } from "lucide-react";

export default function PanelHistoryTable({ panels, pcsKey }: { panels: any[]; pcsKey: string }) {
  const displayItems: any[] = [];
  let currentOpCount = 0;
  let globalRowCount = 0;
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
      let displayTotal = currentOpCount;

      displayItems.push({
        isSummaryRow: true,
        operatorName: lastOprString,
        totalCount: displayTotal,
        id: `summary-${idx}`
      });
      currentOpCount = 0;
      lastOprString = operatorStr;
      isSameAsPrev = false;
    } else if (displayItems.length > 0) {
      isSameAsPrev = true;
    }

    let cacatLines: string[] = [];
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
    const combinedCacat = cacatLines.join("\n");

    let finalOprStr = isSameAsPrev ? "" : opr;
    let finalGrpStr = isSameAsPrev ? "" : grp;
    let finalTglStr = isSameAsPrev ? "" : (panel.tgl ? new Date(panel.tgl).toLocaleDateString('en-CA') : (panel.tanggal_jam ? new Date(panel.tanggal_jam).toISOString().split('T')[0] : "-"));

    if (isIstirahat) {
      finalOprStr = "Istirahat";
      finalGrpStr = "";
      finalTglStr = "";
    }

    const displayNo = panel.panel_no;
    const isPlaceholder = isIstirahat && !combinedCacat;

    displayItems.push({
      id: `${idx}-${Math.random()}`,
      panel_no: displayNo,
      tglStr: finalTglStr,
      grpStr: finalGrpStr,
      oprStr: finalOprStr,
      meter_kain: "-",
      isError: hasErrorDetail,
      cacat: hasErrorDetail && combinedCacat ? combinedCacat : "-",
      isIstirahat,
      db_id: panel.id
    });

    currentOpCount += 1;
    globalRowCount += 1;

    if (idx === panels.length - 1) {
      displayItems.push({
        isSummaryRow: true,
        operatorName: operatorStr,
        totalCount: currentOpCount,
        id: `summary-end`
      });
    }
  });

  return (
    <table className="text-left text-xs border-collapse w-full">
      <thead>
        <tr className="bg-slate-50">
          <th className="px-3 py-2 border-b border-r border-slate-200 font-extrabold text-slate-600 w-12 text-center">PNL NO</th>
          <th className="px-3 py-2 border-b border-r border-slate-200 font-extrabold text-slate-600 w-24">TGL</th>
          <th className="px-3 py-2 border-b border-r border-slate-200 font-extrabold text-slate-600 w-16 text-center">Group</th>
          <th className="px-3 py-2 border-b border-r border-slate-200 font-extrabold text-slate-600 w-24">Operator</th>
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
                <td colSpan={4} className="px-3 py-2 text-right whitespace-nowrap">Total Produksi {item.operatorName}:</td>
                <td className="px-3 py-2 text-center text-slate-800 font-bold whitespace-nowrap">
                  {item.totalCount}
                </td>
                <td colSpan={2} className="bg-slate-100"></td>
              </tr>
            );
          }

          return (
            <tr key={item.id} className={`${item.isIstirahat ? "bg-amber-50/30" : "hover:bg-slate-50"} transition-colors`}>
              <td className="px-3 py-2 border-r border-slate-100 font-bold text-slate-800 text-center align-top">
                 {item.panel_no}
              </td>
              <td className="px-3 py-2 border-r border-slate-100 text-slate-600 whitespace-nowrap align-top">{item.tglStr}</td>
              <td className="px-3 py-2 border-r border-slate-100 font-medium text-slate-700 text-center align-top">{item.grpStr}</td>
              <td className="px-3 py-2 border-r border-slate-100 font-medium text-slate-700 align-top">{item.oprStr}</td>
              <td className={`px-3 py-2 border-r border-slate-100 text-center font-bold align-top ${(item.cacat !== "-" && item.cacat !== "ISTIRAHAT") ? "text-red-600" : "text-emerald-600"}`}>
                {(item.cacat !== "-" && item.cacat !== "ISTIRAHAT") ? "X" : "✓"}
              </td>
              <td className={`px-3 py-2 border-r border-slate-100 whitespace-pre overflow-x-auto max-w-xs align-top ${item.isIstirahat ? "text-slate-500 italic" : (item.isError && item.cacat !== "FINISH" ? 'text-red-600' : 'text-slate-700')}`}>
                {item.cacat}
              </td>
              <td className="px-3 py-2 text-center align-top">
                {item.db_id && item.cacat !== "FINISH" && (
                  <Link href={`/edit/${item.db_id}`} className="inline-flex items-center justify-center p-1.5 rounded hover:bg-sky-100 text-[#0070bc] transition-colors" title="Edit Data">
                    <Edit className="w-3.5 h-3.5" />
                  </Link>
                )}
              </td>
            </tr>
          );
        }) : (
          <tr>
            <td colSpan={7} className="px-3 py-4 text-center text-slate-400">Belum ada baris</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
