"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  getMendingReportOptions, 
  getMendingReportData,
  getAllDetailsForPcs
} from "@/actions/mending-actions";
import { 
  FileSpreadsheet, 
  Search, 
  Loader2, 
  AlertTriangle,
  Download,
  Filter,
  Package
} from "lucide-react";
import * as xlsx from "xlsx";
import { PROBLEM_DETAILS } from "../../../qc/page";

const cleanMeterVal = (val: any) => {
  if (val === null || val === undefined) return "";
  const str = String(val);
  const clean = str.replace(/PCS\s*\d+\s*:\s*/gi, "");
  return clean.replace(/[a-zA-Z\s]+$/g, "").trim();
};

const getActualMeter = (item: any, h: any) => {
  if (item.meter_kain !== null && item.meter_kain !== undefined && String(item.meter_kain).trim() !== "") {
    const clean = cleanMeterVal(item.meter_kain);
    const parsed = parseFloat(clean);
    if (!isNaN(parsed)) return parsed;
  }
  if (item.detail_masalah) {
    const meterMatch = item.detail_masalah.match(/\(Titik:\s*([A-Za-z0-9\s.\-]+)\)/i);
    if (meterMatch && meterMatch[1]) {
      const clean = cleanMeterVal(meterMatch[1]);
      const parsed = parseFloat(clean);
      if (!isNaN(parsed)) return parsed;
    }
  }
  const isIstirahat = (!!item.keterangan_cacat?.toUpperCase().includes("ISTIRAHAT") || 
                       !!item.kategori_masalah?.toUpperCase().includes("ISTIRAHAT")) && 
                      !item.kategori_masalah && !item.detail_masalah;
  const isFinishReport = h?.meter_akhir !== null && h?.meter_akhir !== undefined && String(h?.meter_akhir).trim() !== "";
  if ((isIstirahat || isFinishReport) && (h?.meter_akhir || h?.meter_awal)) {
    const clean = cleanMeterVal(h?.meter_akhir || h?.meter_awal);
    const parsed = parseFloat(clean);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
};

export default function MendingProductionReportPage() {
  const [options, setOptions] = useState<{ mesins: string[], potongans: number[], designs: string[] }>({
    mesins: [],
    potongans: [],
    designs: []
  });

  const [filters, setFilters] = useState({
    nomor_mc: "",
    potongan_ke: "",
    design_id: ""
  });

  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const displayData = useMemo(() => {
    return data.map((pcs) => {
      const items = pcs.items || [];
      const isMeter = items[0]?.detail?.header?.panel_no === "METERAN" || pcs.allPcsDetails?.length > 0;

      if (isMeter && pcs.allPcsDetails && pcs.allPcsDetails.length > 0) {
        const detailsToDisplay = pcs.allPcsDetails.map((detail: any) => {
          const mendingItem = items.find((item: any) => item.detail?.id === detail.id);
          return {
            ...detail,
            hasil_mending_original: mendingItem?.hasil_mending || null,
            final_inspection_id: detail.final_inspection_id,
            production_headers: detail.production_headers || detail.header || pcs.header,
          };
        }).sort((a: any, b: any) => {
          const hjA = String(a.production_headers?.tanggal_jam || "");
          const hjB = String(b.production_headers?.tanggal_jam || "");
          if (hjA !== hjB) return hjA.localeCompare(hjB);

          const isSpecialA = ((!!a.keterangan_cacat?.toUpperCase().includes("ISTIRAHAT") || !!a.kategori_masalah?.toUpperCase().includes("ISTIRAHAT"))
                && !a.kategori_masalah && !a.detail_masalah)
            || (a.production_headers?.meter_akhir !== null && a.production_headers?.meter_akhir !== undefined
                && String(a.production_headers?.meter_akhir).trim() !== ""
                && (a.meter_kain === null || a.meter_kain === undefined));
          const isSpecialB = ((!!b.keterangan_cacat?.toUpperCase().includes("ISTIRAHAT") || !!b.kategori_masalah?.toUpperCase().includes("ISTIRAHAT"))
                && !b.kategori_masalah && !b.detail_masalah)
            || (b.production_headers?.meter_akhir !== null && b.production_headers?.meter_akhir !== undefined
                && String(b.production_headers?.meter_akhir).trim() !== ""
                && (b.meter_kain === null || b.meter_kain === undefined));

          if (isSpecialA && !isSpecialB) return 1;
          if (!isSpecialA && isSpecialB) return -1;
          if (isSpecialA && isSpecialB) return 0;

          const valA = getActualMeter(a, a.production_headers);
          const valB = getActualMeter(b, b.production_headers);
          const mA = valA !== null ? valA : Infinity;
          const mB = valB !== null ? valB : Infinity;
          if (mA === Infinity && mB === Infinity) return 0;
          return mA - mB;
        });

        const displayItems: any[] = [];
        let globalRowCount = 0;
        let prevOperatorLastMeter: number | null = null;
        let currentOpStartMeter: number | null = null;
        let currentOpLastMeter: number | null = null;
        let lastOprString = "";

        detailsToDisplay.forEach((item: any, idx: number) => {
          const h = item.production_headers || {};
          const opr = h.operators?.nama_operator || h.pic || "";
          const grp = h.groups?.nama_grup || "";
          const operatorStr = (grp ? `(${grp}) ` : '') + opr;

          if (displayItems.length === 0) {
            lastOprString = operatorStr;
          }

          let isSameAsPrev = false;
          if (operatorStr !== lastOprString && displayItems.length > 0) {
            const totalMeter = currentOpStartMeter !== null && currentOpLastMeter !== null
              ? Math.abs(currentOpLastMeter - currentOpStartMeter)
              : null;
            const [prevGrp, prevOpr] = lastOprString.includes(") ") 
              ? [lastOprString.match(/\(([^)]+)\)/)?.[1] || "", lastOprString.replace(/^\([^)]+\)\s*/, "")]
              : ["", lastOprString];
            displayItems.push({
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
          } else if (displayItems.length > 0) {
            isSameAsPrev = true;
          }

          const isIstirahat = (!!item.keterangan_cacat?.toUpperCase().includes("ISTIRAHAT") || 
                               !!item.kategori_masalah?.toUpperCase().includes("ISTIRAHAT")) && 
                              !item.kategori_masalah && !item.detail_masalah;
          const isFinishReport = h.meter_akhir !== null && h.meter_akhir !== undefined && String(h.meter_akhir).trim() !== "";

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

          if (!isSameAsPrev) {
            const startTglStr = h.tgl || "-";
            const startMeter = prevOperatorLastMeter !== null
              ? String(prevOperatorLastMeter)
              : (h.meter_awal !== undefined && h.meter_awal !== null ? cleanMeterVal(h.meter_awal) : "0");

            displayItems.push({
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

          const finalOprStr = isSameAsPrev ? "" : opr;
          const finalGrpStr = isSameAsPrev ? "" : grp;
          const finalTglStr = isSameAsPrev ? "" : h.tgl || "-";

          const showTgl = !isSameAsPrev;
          const showGrp = !isSameAsPrev;
          const showOpr = !isSameAsPrev;

          const isGradable = !isIstirahat && (!isFinishReport || item.kategori_masalah || item.detail_masalah);
          const cacatForMeter = (item.detail_masalah || item.keterangan_cacat || "")
            .split("\n")
            .map((line: string) => line.replace(/\s*\(Titik:\s*[A-Za-z0-9\s.\-]+\)/gi, "").trim())
            .filter(Boolean)
            .join("\n");
          const cacatText = isIstirahat ? "ISTIRAHAT" : (isFinishReport && !item.kategori_masalah && !item.detail_masalah ? "FINISH" : (cacatForMeter ? cacatForMeter : "-"));

          const isPlaceholder = meterDisplay === "-" && !item.kategori_masalah && !item.detail_masalah && !isIstirahat && !isFinishReport;
          if (!isPlaceholder) {
            displayItems.push({
              detail: item,
              id: item.id || `detail-${idx}-${Math.random()}`,
              hasil_mending: item.hasil_mending_original,
              hasil_mending_original: item.hasil_mending_original,
              isStartRow: false,
              isMeter: true,
              isIstirahat,
              isFinishReport,
              displayNo: (globalRowCount + 1).toString(),
              tglStr: finalTglStr,
              grpStr: finalGrpStr,
              oprStr: finalOprStr,
              meterDisplay,
              cacatDisplay: cacatText,
              isGradable,
              showTgl,
              showGrp,
              showOpr,
              hasErrorDetail: !!item.kategori_masalah || !!item.detail_masalah
            });
            globalRowCount += 1;

            const meterVal = parseFloat(cleanMeterVal(meterDisplay));
            if (!isNaN(meterVal)) {
              if (currentOpStartMeter === null) currentOpStartMeter = meterVal;
              currentOpLastMeter = meterVal;
            }
          }
        });

        if (displayItems.length > 0 && currentOpStartMeter !== null && currentOpLastMeter !== null) {
          const totalMeter = Math.abs(currentOpLastMeter - currentOpStartMeter);
          const [lastGrp, lastOprOnly] = lastOprString.includes(") ") 
            ? [lastOprString.match(/\(([^)]+)\)/)?.[1] || "", lastOprString.replace(/^\([^)]+\)\s*/, "")]
            : ["", lastOprString];
          displayItems.push({
            id: `total-last-${lastOprString}-${Math.random()}`,
            isTotalRow: true,
            totalLabel: `Total Produksi${lastGrp ? ` (${lastGrp})` : ""} ${lastOprOnly}:`,
            totalMeter: `${totalMeter} Meter`,
          });
        }

        return { ...pcs, displayItems };
      }

      const sortedItems = [...items].sort((a, b) => {
        const pA = a.detail?.header?.panel_no;
        const pB = b.detail?.header?.panel_no;
        if (pA === "METERAN" && pB === "METERAN") {
          return parseFloat(a.detail?.meter_kain || 0) - parseFloat(b.detail?.meter_kain || 0);
        }
        if (pA === "METERAN") return 1;
        if (pB === "METERAN") return -1;
        return parseInt(pA || 0) - parseInt(pB || 0);
      });

      const displayItems: any[] = [];
      let currentOpCount = 0;
      let lastOprString = "";

      sortedItems.forEach((item, idx) => {
        const det = item.detail || {};
        let opr = det.header?.operators?.nama_operator || det.header?.pic || "";
        const grp = det.header?.groups?.nama_grup || "";
        const operatorStr = (grp ? `(${grp}) ` : '') + opr;
        
        if (idx === 0) {
          lastOprString = operatorStr;
        }

        let isSameAsPrev = false;

        if (operatorStr !== lastOprString && idx > 0) {
          displayItems.push({
            isSummaryRow: true,
            operatorName: lastOprString,
            totalCount: currentOpCount,
            id: `summary-${idx}`
          });
          currentOpCount = 0;
          lastOprString = operatorStr;
          isSameAsPrev = false;
        } else if (idx > 0) {
          isSameAsPrev = true;
        }

        displayItems.push({
          ...item,
          hideOperatorAndDate: isSameAsPrev
        });

        currentOpCount += Number(det.jml_hasil_produksi || 1);
        
        if (idx === sortedItems.length - 1) {
          displayItems.push({
            isSummaryRow: true,
            operatorName: operatorStr,
            totalCount: currentOpCount,
            id: `summary-end`
          });
        }
      });

      return { ...pcs, displayItems };
    });
  }, [data]);

  useEffect(() => {
    getMendingReportOptions().then(res => {
      if (res.success && res.data) {
        setOptions({
          mesins: (res.data.mesins as any[]).sort(),
          potongans: (res.data.potongans as any[]).sort((a,b) => Number(a) - Number(b)),
          designs: (res.data.designs as any[]).sort()
        });
      }
    });
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!filters.nomor_mc || !filters.potongan_ke) {
      setErrorMsg("Mesin dan Potongan Ke harus dipilih!");
      return;
    }
    
    setIsLoading(true);
    setErrorMsg(null);
    setHasSearched(true);
    
    try {
      const res = await getMendingReportData(filters.nomor_mc, filters.potongan_ke, filters.design_id);
      if (res.success && res.data) {
        const sortedData = [...res.data].sort((a, b) => {
          return Number(a.detail.pcs_index) - Number(b.detail.pcs_index);
        });

        const updatedData = await Promise.all(
          sortedData.map(async (pcs: any) => {
            const headerInfo = pcs.header || {};
            const nomor_mc = filters.nomor_mc;
            const design_id = headerInfo.design_id || filters.design_id;
            const potongan_ke = filters.potongan_ke;
            const pcs_index = pcs.detail?.pcs_index || pcs.pcs_index;

            const detailsRes = await getAllDetailsForPcs(
              nomor_mc,
              design_id,
              parseInt(potongan_ke),
              parseInt(pcs_index)
            );

            if (detailsRes.success && detailsRes.data) {
              return { ...pcs, allPcsDetails: detailsRes.data };
            }
            return { ...pcs, allPcsDetails: [] };
          })
        );

        setData(updatedData);
      } else {
        setErrorMsg(res.error || "Gagal mengambil data laporan.");
        setData([]);
      }
    } catch (err: any) {
      setErrorMsg("Terjadi kesalahan jaringan.");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (data.length === 0) return;
    const headerRow = data[0]?.header || {};
    const firstPcs = data[0];

    const isReportMeter = firstPcs?.items?.[0]?.detail?.header?.panel_no === "METERAN";
    const reportType = isReportMeter ? "ALL OVER" : "PANEL";

    const wb = xlsx.utils.book_new();
    const wsData: any[][] = [];

    // Header Title
    wsData.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", `FORM KUALITAS PRODUKSI KAIN ${reportType}`]);
    wsData.push([]);
    wsData.push([]);
    
    // Header Info
    wsData.push(["", "Design                    ", "", ":", headerRow.design_id || "", "", "", "", "", "", "", "Potongan ke", "", ":", headerRow.potongan_ke || ""]);
    wsData.push(["", "Nomor Mc           ", "", ":", headerRow.nomor_mc || "", "", "", "", "", "", "", "Roll no", "", ":", firstPcs.roll_no || ""]);
    wsData.push(["", "Tanggal produksi", "", ":", headerRow.tgl || "", "", "", "", "", "", "", "Jenis Benang Dsr", "", ":", headerRow.jenis_benang_dasar || ""]);
    wsData.push(["", "Tanggal potong", "", ":", headerRow.tanggal_potong || headerRow.tgl || "", "", "", "", "", "", "", "Liner", "", ":", headerRow.liner || ""]);
    wsData.push(["", "Pick", "", ":", headerRow.pick || "", "", "", "", "", "", "", "Heavy", "", ":", headerRow.heavy || ""]);
    wsData.push(["", "Course", "", ":", headerRow.course || "", "", "", "", "", "", "", "Shadow", "", ":", headerRow.shadow || ""]);
    wsData.push(["", "Rpm", "", ":", headerRow.rpm || "", "", "", "", "", "", "", "Pinggiran", "", ":", headerRow.pinggiran || ""]);
    wsData.push(["", "No. Order Barang", "", ":", headerRow.no_order_barang || "", "", "", "", "", "", "", "No. costumer", "", ":", headerRow.no_customer || ""]);
    wsData.push([]);

    // Table Headers
    const pcsRow: any[] = [""];
    const titleRow: any[] = [""];
    const gradeRow: any[] = [""];
    
    data.forEach((pcs, idx) => {
      const isFirst = idx === 0;
      const spacing = isFirst ? 0 : 3;
      for (let i = 0; i < spacing; i++) {
        pcsRow.push("");
        titleRow.push("");
        gradeRow.push("");
      }

      const pcsLabel = `PCS ${pcs.detail.pcs_index}`;
      pcsRow.push(pcsLabel, "", "", "", "", "", "", "", "");
      titleRow.push("PNL NO", "TGL", "Group", "Operator", "KET ✓/X", "KETERANGAN CACAT", "INSPECTING", "", "");
      gradeRow.push("", "", "", "", "", "", "A", "B", "BS");
    });
    
    wsData.push(pcsRow);
    wsData.push(titleRow);
    wsData.push(gradeRow);

    // Find max items across all PCS
    let maxItems = 0;
    displayData.forEach(pcs => {
      if (pcs.displayItems && pcs.displayItems.length > maxItems) {
        maxItems = pcs.displayItems.length;
      }
    });

    // Populate Items Data
    for (let i = 0; i < maxItems; i++) {
      const row: any[] = [""];
      displayData.forEach((pcs, idx) => {
        const isFirst = idx === 0;
        const spacing = isFirst ? 0 : 3;
        for (let s = 0; s < spacing; s++) {
          row.push("");
        }

        const item = pcs.displayItems && pcs.displayItems.length > i ? pcs.displayItems[i] : null;
        if (item) {
          if (item.isSummaryRow) {
            row.push("", "", `Total Produksi ${item.operatorName}:`, item.totalCount, "", "", "", "", "");
          } else if (item.isTotalRow) {
            row.push("", "", item.totalLabel, item.totalMeter, "", "", "", "", "");
          } else if (item.isMeter) {
            const pnlNo = item.meterDisplay;
            const tgl = item.tglStr;
            const grpStr = item.grpStr;
            const oprStr = item.oprStr;
            const ket = !item.isGradable ? "" : (item.hasErrorDetail ? "X" : "✓");
            const cacat = item.cacatDisplay;
            const grade = item.hasil_mending_original || item.hasil_mending;
            const gradeA = (item.isGradable && grade === "A") ? "A" : "";
            const gradeB = (item.isGradable && grade === "B") ? "B" : "";
            const gradeBS = (item.isGradable && grade === "BS") ? "BS" : "";
            row.push(pnlNo, tgl, grpStr, oprStr, ket, cacat, gradeA, gradeB, gradeBS);
          } else {
            const det = item.detail || {};
            const pnlNo = det.header?.panel_no === "METERAN" ? det.meter_kain : det.header?.panel_no;
            const tgl = item.hideOperatorAndDate ? "" : (det.header?.tgl || "");
            let opr = det.header?.operators?.nama_operator || det.header?.pic || "";
            const grp = det.header?.groups?.nama_grup || "";
            const grpStr = item.hideOperatorAndDate ? "" : grp;
            let oprStr = item.hideOperatorAndDate ? "" : opr;
            let displayKeterangan = det.keterangan_cacat || "";
            if (displayKeterangan.includes("ISTIRAHAT")) {
              oprStr = "Istirahat";
              displayKeterangan = displayKeterangan.replace(/\[?(SEBELUM|LAPORAN)?\s*ISTIRAHAT\]?/gi, "").trim();
              displayKeterangan = displayKeterangan.replace(/^,\s*|\s*,\s*$/g, "");
            }
            
            let cacatLines: string[] = [];
            const katsRaw = det.kategori_masalah;
            const kats = katsRaw ? (Array.isArray(katsRaw) ? katsRaw : katsRaw.split(",").map((s: string) => s.trim())) : [];
            const displayDetail = det.detail_masalah || "";
            
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
                for (let i = 0; i < cacatLines.length; i++) {
                  cacatLines[i] = cacatLines[i] + " [TAMBAHAN QC]";
                }
              }
            }
            
            let cacat = cacatLines.join("\n");
            
            const gradeA = item.hasil_mending === "A" ? "A" : "";
            const gradeB = item.hasil_mending === "B" ? "B" : "";
            const gradeBS = item.hasil_mending === "BS" ? "BS" : "";
            const ket = det.kategori_masalah ? "X" : "✓";

            row.push(pnlNo, tgl, grpStr, oprStr, ket, cacat, gradeA, gradeB, gradeBS);
          }
        } else {
          row.push("", "", "", "", "", "", "", "", "");
        }
      });
      wsData.push(row);
    }

    // Summary Tables at the bottom
    wsData.push([]); // empty row
    
    const sumTitleRow: any[] = [""];
    const sumRowA: any[] = [""];
    const sumRowB: any[] = [""];
    const sumRowBS: any[] = [""];
    const infoBlank: any[] = [""];
    const infoRow1: any[] = [""];
    const infoRow2: any[] = [""];
    const infoRow3: any[] = [""];
    const infoRow4: any[] = [""];
    const infoRow5: any[] = [""];
    const infoRow6: any[] = [""];

    data.forEach((pcs, idx) => {
      const isFirst = idx === 0;
      const spacing = isFirst ? 0 : 3;
      for (let i = 0; i < spacing; i++) {
        sumTitleRow.push("");
        sumRowA.push("");
        sumRowB.push("");
        sumRowBS.push("");
        infoBlank.push("");
        infoRow1.push("");
        infoRow2.push("");
        infoRow3.push("");
        infoRow4.push("");
        infoRow5.push("");
        infoRow6.push("");
      }
      
      const items = pcs.items || [];
      const prodA = items.filter((i:any) => !i.detail?.kategori_masalah).length;
      const prodB = items.filter((i:any) => i.detail?.kategori_masalah).length;
      const prodBS = 0;
      
      const inspectA = items.filter((i:any) => i.hasil_mending === "A").length;
      const inspectB = items.filter((i:any) => i.hasil_mending === "B").length;
      const inspectBS = items.filter((i:any) => i.hasil_mending === "BS").length;

      const isMeter = items[0]?.detail?.header?.panel_no === "METERAN";
      let totalQty = 0;
      let totalCacat = 0;
      if (isMeter) {
        items.forEach((i: any) => {
          totalQty = Math.max(totalQty, Number(i.detail?.jml_hasil_produksi || 0));
          if (i.detail?.kategori_masalah || i.hasil_mending === "B" || i.hasil_mending === "BS") {
            totalCacat += 1;
          }
        });
        if (totalQty === 0) totalQty = 300;
      } else {
        items.forEach((i: any) => {
          totalQty += Number(i.detail?.jml_hasil_produksi || 0);
          if (i.detail?.kategori_masalah || i.hasil_mending === "B" || i.hasil_mending === "BS") {
            totalCacat += Number(i.detail?.jml_hasil_produksi || 1);
          }
        });
      }
      
      const computedTotalQty = totalQty;
      const sortedItems = items;

      const totalSetelahInspect = sortedItems.length;
      const beratInspect = pcs.qc_batch?.berat_kain || "";
      const tanggalInspect = pcs.qc_batch?.tanggal_inspeksi || "";
      const petugasInspect = pcs.qc_batch?.petugas_inspeksi || "";
      const startInspect = pcs.qc_batch?.start_inspect || "";
      const finishInspect = pcs.qc_batch?.finish_inspect || "";

      // Calculate Overall Grade
      let overallGrade = "-";
      let bucket = 0;
      if (totalQty > 0) {
        if (isMeter) {
          bucket = 300;
          if (totalQty > 450) bucket = 500;
          else if (totalQty > 400) bucket = 450;
          else if (totalQty > 350) bucket = 400;
          else if (totalQty > 300) bucket = 350;
          else bucket = 300;
          
          let limitA = 9, limitB = 15, limitC = 21;
          if (bucket === 350) { limitA = 11; limitB = 18; limitC = 25; }
          if (bucket === 400) { limitA = 12; limitB = 20; limitC = 28; }
          if (bucket === 450) { limitA = 14; limitB = 23; limitC = 32; }
          if (bucket === 500) { limitA = 15; limitB = 25; limitC = 35; }
          
          if (totalCacat <= limitA) overallGrade = "A";
          else if (totalCacat <= limitB) overallGrade = "B";
          else if (totalCacat <= limitC) overallGrade = "C";
          else overallGrade = "D";
        } else {
          bucket = 50;
          if (totalQty > 125) bucket = 150;
          else if (totalQty > 120) bucket = 125;
          else if (totalQty > 100) bucket = 120;
          else if (totalQty > 75) bucket = 100;
          else if (totalQty > 65) bucket = 75;
          else if (totalQty > 50) bucket = 65;
          else bucket = 50;

          let limitA = 5, limitB = 8, limitC = 9; 
          if (bucket === 65) { limitA = 7; limitB = 10; limitC = 13; }
          if (bucket === 75) { limitA = 8; limitB = 12; limitC = 15; }
          if (bucket === 100) { limitA = 10; limitB = 15; limitC = 19; }
          if (bucket === 120) { limitA = 12; limitB = 18; limitC = 23; }
          if (bucket === 125) { limitA = 13; limitB = 19; limitC = 25; }
          if (bucket === 150) { limitA = 15; limitB = 23; limitC = 29; }

          if (totalCacat <= limitA) overallGrade = "A";
          else if (totalCacat <= limitB) overallGrade = "B";
          else if (totalCacat <= limitC) overallGrade = "C";
          else overallGrade = "D";
        }
      }

      const unit = isMeter ? 'Meter' : 'Panel';

      sumTitleRow.push("KET", "Produksi", "Setelah Inspect", "", "GRADE KESELURUHAN", "", "", "", "");
      sumRowA.push("Total Grade A", prodA, inspectA, "", overallGrade, "", "", "", "");
      sumRowB.push("Total Grade B", prodB, inspectB, "", bucket > 0 ? `Kategori: Max ${bucket} ${unit}` : "", "", "", "", "");
      sumRowBS.push("BS", prodBS, inspectBS, "", `Total: ${totalQty} ${unit} • Cacat: ${totalCacat}`, "", "", "", "");

      infoBlank.push("", "", "", "", "", "", "", "", "");
      infoRow1.push(`Total ${unit} Setelah di Inspecting`, ":", totalSetelahInspect, "", "", "", "", "", "");
      infoRow2.push(`Berat Inspecting`, ":", beratInspect, "", "", "", "", "", "");
      infoRow3.push(`Tanggal Inspecting`, ":", tanggalInspect, "", `Tanggal Mending`, ":", pcs.tanggal_mending || "", "", "");
      infoRow4.push(`Petugas Inspecting`, ":", petugasInspect, "", `Petugas Mending`, ":", pcs.petugas_mending || "", "", "");
      infoRow5.push(`Start Inspect`, ":", startInspect, "", `Start Mending`, ":", pcs.start_mending || "", "", "");
      infoRow6.push(`Finish Inspect`, ":", finishInspect, "", `Finish Mending`, ":", pcs.finish_mending || "", "", "");
    });

    wsData.push(sumTitleRow);
    wsData.push(sumRowA);
    wsData.push(sumRowB);
    wsData.push(sumRowBS);
    wsData.push(infoBlank);
    wsData.push(infoRow1);
    wsData.push(infoRow2);
    wsData.push(infoRow3);
    wsData.push(infoRow4);
    wsData.push(infoRow5);
    wsData.push(infoRow6);

    const ws = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(wb, ws, "Hasil Produksi");
    
    // Download
    const fileName = `Hasil_Produksi_Mending_${filters.nomor_mc}_Potongan${filters.potongan_ke}.xlsx`;
    xlsx.writeFile(wb, fileName);
  };

  const headerInfo = data.length > 0 ? data[0].header : null;

  const getOverallGradeInfo = (totalQty: number, totalCacat: number, isMeter: boolean) => {
    let grade = "-";
    let bucket = 0;
    
    if (totalQty === 0) return { grade, bucket };
    
    if (isMeter) {
      bucket = 300;
      if (totalQty > 450) bucket = 500;
      else if (totalQty > 400) bucket = 450;
      else if (totalQty > 350) bucket = 400;
      else if (totalQty > 300) bucket = 350;
      else bucket = 300;
      
      let limitA = 9, limitB = 15, limitC = 21;
      if (bucket === 350) { limitA = 11; limitB = 18; limitC = 25; }
      if (bucket === 400) { limitA = 12; limitB = 20; limitC = 28; }
      if (bucket === 450) { limitA = 14; limitB = 23; limitC = 32; }
      if (bucket === 500) { limitA = 15; limitB = 25; limitC = 35; }
      
      if (totalCacat <= limitA) grade = "A";
      else if (totalCacat <= limitB) grade = "B";
      else if (totalCacat <= limitC) grade = "C";
      else grade = "D";
    } else {
      bucket = 50;
      if (totalQty > 125) bucket = 150;
      else if (totalQty > 120) bucket = 125;
      else if (totalQty > 100) bucket = 120;
      else if (totalQty > 75) bucket = 100;
      else if (totalQty > 65) bucket = 75;
      else if (totalQty > 50) bucket = 65;
      else bucket = 50;

      let limitA = 5, limitB = 8, limitC = 9; 
      if (bucket === 65) { limitA = 7; limitB = 10; limitC = 13; }
      if (bucket === 75) { limitA = 8; limitB = 12; limitC = 15; }
      if (bucket === 100) { limitA = 10; limitB = 15; limitC = 19; }
      if (bucket === 120) { limitA = 12; limitB = 18; limitC = 23; }
      if (bucket === 125) { limitA = 13; limitB = 19; limitC = 25; }
      if (bucket === 150) { limitA = 15; limitB = 23; limitC = 29; }

      if (totalCacat <= limitA) grade = "A";
      else if (totalCacat <= limitB) grade = "B";
      else if (totalCacat <= limitC) grade = "C";
      else grade = "D";
    }
    
    return { grade, bucket };
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-20 animate-fadeIn">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            Laporan Kualitas Produksi Kain {data.length > 0 && data[0]?.items?.[0]?.detail?.header?.panel_no === "METERAN" ? "All Over" : "Panel"}
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Lihat hasil produksi mending per potongan dengan format bersampingan.
          </p>
        </div>
        {data.length > 0 && (
          <button
            onClick={handleExportExcel}
            className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export ke Excel
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Filter Card */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex flex-col gap-1 w-full sm:w-1/4">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Pilih Mesin
            </label>
            <select
              value={filters.nomor_mc}
              onChange={(e) => setFilters({ ...filters, nomor_mc: e.target.value })}
              className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:bg-white outline-none w-full transition-colors"
            >
              <option value="">-- Pilih Mesin --</option>
              {options.mesins.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col gap-1 w-full sm:w-1/4">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Pilih Potongan Ke
            </label>
            <select
              value={filters.potongan_ke}
              onChange={(e) => setFilters({ ...filters, potongan_ke: e.target.value })}
              className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:bg-white outline-none w-full transition-colors"
            >
              <option value="">-- Pilih Potongan --</option>
              {options.potongans.map((p) => (
                <option key={p} value={String(p)}>Potongan Ke-{p}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-1/4">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Desain (Opsional)
            </label>
            <select
              value={filters.design_id}
              onChange={(e) => setFilters({ ...filters, design_id: e.target.value })}
              className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:border-sky-400 focus:bg-white outline-none w-full transition-colors"
            >
              <option value="">-- Semua Desain --</option>
              {options.designs.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="h-11 px-8 rounded-xl bg-[#0070bc] hover:bg-[#004777] active:scale-95 disabled:opacity-50 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-4 h-4" />}
            Tampilkan
          </button>
        </form>
      </div>

      {hasSearched && data.length === 0 && !isLoading && (
        <div className="bg-white rounded-2xl p-16 shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Package className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">Data Tidak Ditemukan</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Tidak ada data hasil produksi (mending) untuk mesin dan potongan yang dipilih. Pastikan mesin dan potongan sudah melalui proses mending.
          </p>
        </div>
      )}

      {data.length > 0 && headerInfo && (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Document Header Section */}
          <div className="p-8 border-b border-slate-200 bg-slate-50/50">
            <div className="flex flex-col items-center justify-center text-center mb-8 border-b border-slate-200 pb-6">
              <h2 className="text-xl font-black text-slate-800 tracking-wider">
                FORM KUALITAS PRODUKSI KAIN {data[0]?.items?.[0]?.detail?.header?.panel_no === "METERAN" ? "ALL OVER" : "PANEL"}
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-1 max-w-5xl mx-auto text-sm">
              <div className="space-y-1">
                <div className="grid grid-cols-3 gap-4">
                  <span className="font-bold text-slate-500">Design</span>
                  <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {headerInfo.design_id || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="font-bold text-slate-500">Nomor Mc</span>
                  <span className="font-black text-[#0070bc] col-span-2 flex gap-2"><span>:</span> {headerInfo.nomor_mc || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="font-bold text-slate-500">Tanggal produksi</span>
                  <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {headerInfo.tgl || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="font-bold text-slate-500">Tanggal potong</span>
                  <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {headerInfo.tanggal_potong || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="font-bold text-slate-500">Pick</span>
                  <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {headerInfo.pick || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="font-bold text-slate-500">Course</span>
                  <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {headerInfo.course || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="font-bold text-slate-500">Rpm</span>
                  <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {headerInfo.rpm || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="font-bold text-slate-500">No. Order Barang</span>
                  <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {headerInfo.no_order_barang || "-"}</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="grid grid-cols-3 gap-4">
                  <span className="font-bold text-slate-500">Potongan ke</span>
                  <span className="font-black text-rose-600 col-span-2 flex gap-2"><span>:</span> {headerInfo.potongan_ke || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="font-bold text-slate-500">Roll no</span>
                  <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {data[0]?.detail?.roll_no || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="font-bold text-slate-500">Jenis Benang Dsr</span>
                  <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {headerInfo.jenis_benang_dasar || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="font-bold text-slate-500">Liner</span>
                  <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {headerInfo.liner || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="font-bold text-slate-500">Heavy</span>
                  <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {headerInfo.heavy || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="font-bold text-slate-500">Shadow</span>
                  <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {headerInfo.shadow || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="font-bold text-slate-500">Pinggiran</span>
                  <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {headerInfo.pinggiran || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="font-bold text-slate-500">No. costumer</span>
                  <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {headerInfo.no_customer || "-"}</span>
                </div>
              </div>
            </div>
          </div>

{/* PCS Tables Grid - Side by Side Scrollable */}
          <div className="w-full overflow-x-auto pb-4 custom-scrollbar bg-slate-50/50 p-6 rounded-b-2xl">
            <div className="flex w-max min-w-full gap-8">
              {displayData.map((pcs, index) => {
                const pcsLabel = `PCS ${pcs.detail.pcs_index}`;
                
                // For grade calculation, we still use the raw sorted items
                const sortedItems = pcs.displayItems ? pcs.displayItems.filter((i: any) => !i.isSummaryRow && !i.isTotalRow && !i.isStartRow) : [];
                const isMeter = pcs.header?.panel_no === "METERAN" || pcs.items?.[0]?.detail?.header?.panel_no === "METERAN";
                let totalQty = 0;
                let totalCacat = 0;
                if (isMeter) {
                  sortedItems.forEach((i: any) => {
                    totalQty = Math.max(totalQty, Number(i.detail?.jml_hasil_produksi || 0));
                    if (i.detail?.kategori_masalah || i.hasil_mending === "B" || i.hasil_mending === "BS") {
                      totalCacat += 1;
                    }
                  });
                  if (totalQty === 0) totalQty = 300;
                } else {
                  sortedItems.forEach((i: any) => {
                    totalQty += Number(i.detail?.jml_hasil_produksi || 0);
                    if (i.detail?.kategori_masalah || i.hasil_mending === "B" || i.hasil_mending === "BS") {
                      totalCacat += Number(i.detail?.jml_hasil_produksi || 1);
                    }
                  });
                }
                const { grade: overallGrade, bucket } = getOverallGradeInfo(totalQty, totalCacat, isMeter);
                const unit = isMeter ? 'Meter' : 'Panel';

                const totalSetelahInspect = sortedItems.length;
                const beratInspect = pcs.qc_batch?.berat_kain || "";
                const tanggalInspect = pcs.qc_batch?.tanggal_inspeksi || "";
                const p1 = pcs.qc_batch?.petugas_inspeksi || "";
                const p2 = pcs.qc_batch?.petugas_inspeksi_2 || "";
                const p3 = pcs.qc_batch?.petugas_inspeksi_3 || "";
                const petugasInspect = [p1, p2, p3].filter(Boolean).join(", ");
                const startInspect = pcs.qc_batch?.start_inspect || "";
                const finishInspect = pcs.qc_batch?.finish_inspect || "";

                return (
                  <div key={pcs.id} className="w-min flex-none bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 text-center">
                      <span className="font-black text-slate-800 text-sm tracking-wider uppercase">{pcsLabel}</span>
                    </div>
                    <table className="text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-2 py-1.5 border-b border-slate-200 font-extrabold text-slate-600 w-12" rowSpan={2}>
                            {isMeter ? "METER" : "PNL NO"}
                          </th>
                          <th className="px-2 py-1.5 border-b border-slate-200 font-extrabold text-slate-600 w-20 whitespace-nowrap" rowSpan={2}>TGL</th>
                          <th className="px-1 py-1.5 border-b border-slate-200 font-extrabold text-slate-600 w-12 text-center" rowSpan={2}>Group</th>
                          <th className="px-1 py-1.5 border-b border-slate-200 font-extrabold text-slate-600 w-24" rowSpan={2}>Operator</th>
                          <th className="px-2 py-1.5 border-b border-slate-200 font-extrabold text-slate-600 w-16 text-center" rowSpan={2}>KET ✓/X</th>
                          <th className="px-2 py-1.5 border-b border-slate-200 font-extrabold text-slate-600 w-72 whitespace-nowrap" rowSpan={2}>KETERANGAN CACAT</th>
                          <th className="px-2 py-1 border-b border-slate-200 font-extrabold text-slate-600 text-center" colSpan={3}>INSPECTING</th>
                        </tr>
                        <tr className="bg-slate-50">
                          <th className="px-1 py-1 border-b border-slate-200 text-center font-black text-emerald-600">A</th>
                          <th className="px-1 py-1 border-b border-slate-200 text-center font-black text-amber-600">B</th>
                          <th className="px-1 py-1 border-b border-slate-200 text-center font-black text-rose-600">BS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {pcs.displayItems && pcs.displayItems.length > 0 ? (
                          pcs.displayItems.map((item: any, itemIndex: number) => {
                            const grade = item.hasil_mending_original || item.hasil_mending;

                            if (item.isTotalRow) {
                              return (
                                <tr key={item.id || itemIndex} className="bg-slate-100 font-semibold text-slate-700">
                                  <td colSpan={9} className="px-3 py-2 text-center text-xs font-bold text-slate-600 border-t border-b border-slate-200">
                                    {item.totalLabel} <span className="font-extrabold text-slate-800 ml-1">{item.totalMeter}</span>
                                  </td>
                                </tr>
                              );
                            }

                            const det = item.detail || {};
                            const isMeterRow = item.isMeter;
                            
                            const pnlNo = isMeterRow ? item.meterDisplay : (det.header?.panel_no === "METERAN" ? det.meter_kain : det.header?.panel_no);
                            const tgl = isMeterRow ? (item.showTgl ? item.tglStr : "") : (item.hideOperatorAndDate ? "" : (det.header?.tgl || "-"));
                            const grpStr = isMeterRow ? (item.showGrp ? item.grpStr : "") : (item.hideOperatorAndDate ? "" : (det.header?.groups?.nama_grup || ""));
                            let oprStr = isMeterRow ? (item.showOpr ? item.oprStr : "") : (item.hideOperatorAndDate ? "" : (det.header?.operators?.nama_operator || det.header?.pic || ""));
                            let displayKeterangan = det.keterangan_cacat || "";
                            if (!isMeterRow && displayKeterangan.includes("ISTIRAHAT")) {
                              oprStr = "Istirahat";
                              displayKeterangan = displayKeterangan.replace(/\[?(SEBELUM|LAPORAN)?\s*ISTIRAHAT\]?/gi, "").trim();
                              displayKeterangan = displayKeterangan.replace(/^,\s*|\s*,\s*$/g, "");
                            }
                            
                            let cacatLines: string[] = [];
                            const katsRaw = det.kategori_masalah;
                            const kats = katsRaw ? (Array.isArray(katsRaw) ? katsRaw : katsRaw.split(",").map((s: string) => s.trim())) : [];
                            const displayDetail = det.detail_masalah || "";
                            
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
                            
                            if (!isMeterRow) {
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
                                  for (let i = 0; i < cacatLines.length; i++) {
                                    cacatLines[i] = cacatLines[i] + " [TAMBAHAN QC]";
                                  }
                                }
                              }
                            }

                            let cacat = isMeterRow ? item.cacatDisplay : (cacatLines.join("\n") || "-");
                            const isGradable = isMeterRow ? item.isGradable : true;
                            const hasError = isMeterRow ? item.hasErrorDetail : !!det.kategori_masalah;
                            
                            return (
                              <tr key={item.id || itemIndex} className="hover:bg-slate-50 transition-colors">
                                <td className="px-2 py-1 font-bold text-slate-800">{pnlNo || "-"}</td>
                                <td className="px-2 py-1 text-slate-600 whitespace-nowrap">{tgl}</td>
                                <td className="px-1 py-1 font-medium text-slate-700 text-center">{grpStr}</td>
                                <td className="px-1 py-1 font-medium text-slate-700 leading-tight">{oprStr}</td>
                                
                                <td className="px-2 py-1 text-center font-bold text-sm">
                                  {!isGradable ? "" : (hasError ? <span className="text-rose-600">X</span> : <span className="text-emerald-600">✓</span>)}
                                </td>
                                
                                <td className="px-2 py-1 text-[11px] text-rose-600 font-medium whitespace-pre leading-tight">{cacat || "-"}</td>

                                <td className="px-1 py-1 text-center">
                                  {isGradable && grade === "A" && <div className="mx-auto w-4 h-4 rounded bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-[10px]">A</div>}
                                </td>
                                <td className="px-1 py-1 text-center">
                                  {isGradable && grade === "B" && <div className="mx-auto w-4 h-4 rounded bg-amber-100 text-amber-700 font-black flex items-center justify-center text-[10px]">B</div>}
                                </td>
                                <td className="px-1 py-1 text-center">
                                  {isGradable && grade === "BS" && <div className="mx-auto w-4 h-4 rounded bg-rose-100 text-rose-700 font-black flex items-center justify-center text-[10px]">BS</div>}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={9} className="px-3 py-8 text-center text-slate-400 font-medium">Belum ada baris mending</td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Summary Table & Overall Grade */}
                    <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col gap-6">
                      <div className="flex flex-col sm:flex-row gap-4 items-stretch w-full">
                        <div className="flex-1">
                          <table className="w-full text-left text-xs border-collapse border border-slate-300 bg-white shadow-sm h-full">
                            <thead>
                              <tr className="bg-slate-100">
                                <th className="px-3 py-2 border border-slate-300 font-extrabold text-slate-700">KET</th>
                                <th className="px-3 py-2 border border-slate-300 font-extrabold text-slate-700 text-center">Produksi</th>
                                <th className="px-3 py-2 border border-slate-300 font-extrabold text-slate-700 text-center">Setelah Inspect</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              <tr className="hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-2 border border-slate-300 font-bold text-slate-800">Total Grade A</td>
                                <td className="px-3 py-2 border border-slate-300 text-center font-bold text-slate-700">
                                  {sortedItems.filter((i: any) => !i.detail?.kategori_masalah).length || 0}
                                </td>
                                <td className="px-3 py-2 border border-slate-300 text-center font-bold text-emerald-600">
                                  {sortedItems.filter((i: any) => i.hasil_mending === "A").length || 0}
                                </td>
                              </tr>
                              <tr className="hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-2 border border-slate-300 font-bold text-slate-800">Total Grade B</td>
                                <td className="px-3 py-2 border border-slate-300 text-center font-bold text-slate-700">
                                  {sortedItems.filter((i: any) => i.detail?.kategori_masalah).length || 0}
                                </td>
                                <td className="px-3 py-2 border border-slate-300 text-center font-bold text-amber-600">
                                  {sortedItems.filter((i: any) => i.hasil_mending === "B").length || 0}
                                </td>
                              </tr>
                              <tr className="hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-2 border border-slate-300 font-bold text-slate-800">BS</td>
                                <td className="px-3 py-2 border border-slate-300 text-center font-bold text-slate-700">0</td>
                                <td className="px-3 py-2 border border-slate-300 text-center font-bold text-rose-600">
                                  {sortedItems.filter((i: any) => i.hasil_mending === "BS").length || 0}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        
                        <div className="flex-1 h-full bg-white border border-slate-300 rounded-xl shadow-sm flex flex-col items-center justify-center py-6 px-4">
                          <span className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Grade Keseluruhan</span>
                          <span className={`text-6xl font-black ${overallGrade === 'A' ? 'text-emerald-500' : overallGrade === 'B' ? 'text-amber-500' : overallGrade === 'C' ? 'text-orange-500' : 'text-rose-600'}`}>
                            {overallGrade}
                          </span>
                          <span className="text-slate-500 text-xs font-semibold mt-3 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                            Kategori: Max {bucket} {unit}
                          </span>
                          <span className="text-slate-400 text-[10px] font-medium mt-1">
                            Total: {totalQty} {unit} &bull; Cacat: {totalCacat}
                          </span>
                        </div>
                      </div>

                      {/* Additional Info Forms */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 w-full">
                        
                        {/* Column 1: Info */}
                        <div className="flex flex-col gap-4">
                          <table className="w-full text-left text-xs border-collapse border border-black bg-white">
                            <tbody>
                              <tr>
                                <td className="px-2 py-1.5 border border-black font-bold w-1/2">Total {unit} Setelah di Inspecting</td>
                                <td className="px-2 py-1.5 border border-black w-1/2">: {totalSetelahInspect}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1.5 border border-black font-bold">Berat Inspecting</td>
                                <td className="px-2 py-1.5 border border-black">: {beratInspect}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Column 2: Inspect Info */}
                        <div className="flex flex-col gap-4">
                          <table className="w-full text-left text-xs border-collapse border border-black bg-white h-full">
                            <tbody>
                              <tr>
                                <td className="px-2 py-1.5 border border-black font-bold w-1/2">Tanggal Inspecting</td>
                                <td className="px-2 py-1.5 border border-black w-1/2">: {tanggalInspect}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1.5 border border-black font-bold w-1/2">Petugas Inspecting</td>
                                <td className="px-2 py-1.5 border border-black w-1/2">: {petugasInspect}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1.5 border border-black font-bold">Start Inspect</td>
                                <td className="px-2 py-1.5 border border-black">: {startInspect}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1.5 border border-black font-bold">Finish Inspect</td>
                                <td className="px-2 py-1.5 border border-black">: {finishInspect}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Column 3: Mending Info */}
                        <div className="flex flex-col gap-4">
                          <table className="w-full text-left text-xs border-collapse border border-black bg-white h-full">
                            <tbody>
                              <tr>
                                <td className="px-2 py-1.5 border border-black font-bold w-1/2">Tanggal Mending</td>
                                <td className="px-2 py-1.5 border border-black w-1/2">: {pcs.tanggal_mending || ""}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1.5 border border-black font-bold w-1/2">Petugas Mending</td>
                                <td className="px-2 py-1.5 border border-black w-1/2">: {pcs.petugas_mending || ""}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1.5 border border-black font-bold">Start Mending</td>
                                <td className="px-2 py-1.5 border border-black">: {pcs.start_mending || ""}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1.5 border border-black font-bold">Finish Mending</td>
                                <td className="px-2 py-1.5 border border-black">: {pcs.finish_mending || ""}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
