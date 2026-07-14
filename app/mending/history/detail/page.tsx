"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ClipboardCheck,
  User,
  Package,
  Box,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle
} from "lucide-react";
import CompactHeaderCard from "@/components/forms/CompactHeaderCard";
import { PROBLEM_DETAILS } from "../../../qc/page";
import { getAllDetailsForPcs } from "@/actions/mending-actions";

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

function MendingDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [mendingData, setMendingData] = useState<any>(null);
  const [allPcsDetails, setAllPcsDetails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!mendingData) return;
    const header = mendingData.header || {};
    const nomor_mc = header.nomor_mc;
    const design_id = header.design_id;
    const potongan_ke = header.potongan_ke;
    const pcs_index = mendingData.pcs_index || mendingData.detail?.pcs_index;

    if (!nomor_mc || !design_id || !potongan_ke || !pcs_index) return;

    getAllDetailsForPcs(nomor_mc, design_id, parseInt(potongan_ke), parseInt(pcs_index)).then((res) => {
      if (res.success && res.data) {
        setAllPcsDetails(res.data);
      }
    });
  }, [mendingData]);

  useEffect(() => {
    if (!id) {
      setErrorMsg("ID Mending tidak ditemukan.");
      setIsLoading(false);
      return;
    }

    const cachedData = sessionStorage.getItem("dji_mending_history_data_v2");
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        const batch = parsed.find((b: any) => b.id.toString() === id);

        if (batch) {
          setMendingData(batch);
        } else {
          setErrorMsg("Data mending tidak ditemukan dalam sesi saat ini. Silakan kembali dan cari ulang.");
        }
      } catch (e) {
        setErrorMsg("Gagal membaca data dari sesi.");
      }
    } else {
      setErrorMsg("Sesi pencarian telah berakhir. Silakan kembali ke halaman riwayat.");
    }

    setIsLoading(false);
  }, [id]);

  const group = mendingData || {};
  const header = group.header || {};
  const isMeteran = header.panel_no === "METERAN";
  const itemLabel = isMeteran ? "Titik Meter" : "Panel";

  let gradeA = 0, gradeB = 0, gradeBS = 0;
  (group.items || []).forEach((item: any) => {
    if (item.hasil_mending === "A") gradeA++;
    if (item.hasil_mending === "B") gradeB++;
    if (item.hasil_mending === "BS") gradeBS++;
  });

  const detailsToDisplay = React.useMemo(() => {
    if (!mendingData) return [];

    if (isMeteran && allPcsDetails.length > 0) {
      return allPcsDetails.map((detail: any) => {
        const mendingItem = (group.items || []).find((item: any) => item.detail?.id === detail.id);
        return {
          ...detail,
          hasil_mending_original: mendingItem?.hasil_mending || null,
          final_inspection_id: detail.final_inspection_id,
          production_headers: detail.production_headers || detail.header || header,
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
    }

    return (group.items || []).map((item: any) => ({
      ...item.detail,
      hasil_mending_original: item.hasil_mending,
      final_inspection_id: item.detail?.final_inspection_id ?? item.final_inspection_id,
      production_headers: item.detail?.header || item.header || header,
    })).sort((a: any, b: any) => {
      if (
        a.production_headers?.panel_no === "METERAN" ||
        b.production_headers?.panel_no === "METERAN"
      ) {
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
      }
      const panelA = parseInt(a.production_headers?.panel_no || "0", 10);
      const panelB = parseInt(b.production_headers?.panel_no || "0", 10);
      return panelA - panelB;
    });
  }, [mendingData, group.items, header, isMeteran, allPcsDetails]);

  const displayItems = React.useMemo(() => {
    if (!mendingData) return [];
    const isMeteranBatch = isMeteran;
    if (!isMeteranBatch) {
      return detailsToDisplay.map((item: any) => ({
        ...item,
        isMeter: false,
        isStartRow: false,
        isIstirahat: false,
        isFinishReport: false,
        displayNo: item.production_headers?.panel_no || "-",
        meterDisplay: "-",
        cacatDisplay: item.detail_masalah || item.keterangan_cacat || "-",
        isGradable: true,
        showTgl: true,
        showGrp: true,
        showOpr: true,
        hasErrorDetail: !!item.kategori_masalah || !!item.detail_masalah
      }));
    }

    const items: any[] = [];
    let globalRowCount = 0;
    let prevOperatorLastMeter: number | null = null;
    let currentOpStartMeter: number | null = null;
    let currentOpLastMeter: number | null = null;
    let lastOprString = "";

    const cleanMeterVal = (val: any) => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      const clean = str.replace(/PCS\s*\d+\s*:\s*/gi, "");
      return clean.replace(/[a-zA-Z\s]+$/g, "").trim();
    };

    detailsToDisplay.forEach((item: any, idx: number) => {
      const h = item.production_headers || {};
      const opr = h.operators?.nama_operator || h.pic || "";
      const grp = h.groups?.nama_grup || "";
      const operatorStr = (grp ? `(${grp}) ` : '') + opr;

      if (items.length === 0) {
        lastOprString = operatorStr;
      }

      let isSameAsPrev = false;
      if (operatorStr !== lastOprString && items.length > 0) {
        const totalMeter = currentOpStartMeter !== null && currentOpLastMeter !== null
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

      const isIstirahat = (!!item.keterangan_cacat?.toUpperCase().includes("ISTIRAHAT") || 
                           !!item.kategori_masalah?.toUpperCase().includes("ISTIRAHAT")) && 
                          !item.kategori_masalah && !item.detail_masalah;
      const isFinishReport = h.meter_akhir !== null && h.meter_akhir !== undefined && String(h.meter_akhir).trim() !== "";

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
        if (item.detail_masalah?.includes(" | ")) {
          const catDetails = item.detail_masalah.split(" | ");
          for (let i = 0; i < Math.max(kats.length, catDetails.length); i++) {
            const k = kats[i] || "Unknown";
            const d = catDetails[i] || "";
            pushDetailsForCat(k, d);
          }
        } else if (item.detail_masalah) {
          if (kats.length === 1) {
            pushDetailsForCat(kats[0], item.detail_masalah);
          } else {
            const dets = item.detail_masalah.split(", ");
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
      } else if (item.detail_masalah) {
        cacatLines.push(item.detail_masalah);
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

      const combinedCacat = cacatLines.join("\n");
      const hasErrorDetail = !!item.kategori_masalah || !!item.detail_masalah;

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

      const finalOprStr = isSameAsPrev ? "" : opr;
      const finalGrpStr = isSameAsPrev ? "" : grp;
      const finalTglStr = isSameAsPrev ? "" : h.tgl || "-";

      const showTgl = !isSameAsPrev;
      const showGrp = !isSameAsPrev;
      const showOpr = !isSameAsPrev;

      const isGradable = !isIstirahat && (!isFinishReport || hasErrorDetail);
      const cacatForMeter = combinedCacat
        .split("\n")
        .map((line: string) => line.replace(/\s*\(Titik:\s*[A-Za-z0-9\s.\-]+\)/gi, "").trim())
        .filter((line: string) => {
          if (!line) return false;
          if (line.includes(" - ")) {
            const detailPart = line.split(" - ").slice(1).join(" - ").trim();
            const withoutBlok = detailPart.replace(/\s*\(Blok[^)]*\)/gi, "").trim();
            return withoutBlok.length > 0;
          }
          return true;
        })
        .join("\n");
      const cacatText = isIstirahat ? "ISTIRAHAT" : (isFinishReport && !hasErrorDetail ? "FINISH" : (hasErrorDetail && cacatForMeter ? cacatForMeter : "-"));

      const isPlaceholder = meterDisplay === "-" && !hasErrorDetail && !isIstirahat && !isFinishReport;
      if (!isPlaceholder) {
        items.push({
          ...item,
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
          hasErrorDetail
        });
        globalRowCount += 1;

        const meterVal = parseFloat(cleanMeterVal(meterDisplay));
        if (!isNaN(meterVal)) {
          if (currentOpStartMeter === null) currentOpStartMeter = meterVal;
          currentOpLastMeter = meterVal;
        }
      }
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
  }, [mendingData, detailsToDisplay, isMeteran]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[#0070bc] mb-4" />
        <span className="text-slate-500 font-medium">Memuat Detail...</span>
      </div>
    );
  }

  if (errorMsg || !mendingData) {
    return (
      <div className="flex-1 w-full max-w-4xl mx-auto py-10 px-4 animate-fadeIn">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Oops! Ada Masalah</h2>
          <p className="text-slate-600 mb-6">{errorMsg || "Data tidak ditemukan."}</p>
          <button
            onClick={() => router.push("/mending/history")}
            className="px-6 py-2 bg-[#0070bc] text-white rounded-xl font-bold hover:bg-[#005a96] transition-colors"
          >
            Kembali ke Riwayat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto pb-20 animate-fadeIn">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/mending/history")}
            className="w-10 h-10 shrink-0 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0070bc]/10 flex items-center justify-center text-[#0070bc] shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Detail Hasil Mending Batch
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-500">
                Desain: {header.design_id || "-"} / Potongan: {header.potongan_ke || "-"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Header Info like Production Detail */}
      <CompactHeaderCard
        nomorMc={header.nomor_mc || "-"}
        shiftName="-"
        operatorName="-"
        design={header.design_id || "-"}
        pcsCount={group.items?.length || 0}
        panelPotongan={`- / ${header.potongan_ke || "-"}`}
        courseRpm={`${header.course || "-"} / ${header.rpm || "-"}`}
        noCustomer={header.no_customer || header.no_order_barang || "-"}
        noOrder={header.no_order_barang || "-"}
        tanggalPotong={header.tanggal_potong || "-"}
        statusMatching={header.status_matching || "-"}
        pick={header.pick || "-"}
        benangDasar={header.jenis_benang_dasar || "-"}
        liner={header.liner || "-"}
        heavy={header.heavy || "-"}
        shadow={header.shadow || "-"}
        pinggiran={header.pinggiran || "-"}
        tanggalProduksi={header.tgl || "-"}
        potonganKe={header.potongan_ke?.toString() || "-"}
        rollNo={group.items?.[0]?.detail?.roll_no || "-"}
        course={header.course || "-"}
        rpm={header.rpm || "-"}
      />

      {/* Mending Summary Info */}
      <div className="mt-6 mb-6 bg-sky-50 border border-sky-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <h4 className="text-[10px] font-bold text-sky-600 uppercase tracking-wider mb-1">Petugas Mending</h4>
            <p className="text-sm font-black text-sky-900">
              {group.petugas_mending}
            </p>
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-sky-600 uppercase tracking-wider mb-1">Waktu Mending</h4>
            <p className="text-sm font-bold text-sky-900">
              {group.tanggal_mending} <br className="sm:hidden" />
              <span className="text-xs">({group.start_mending} - {group.finish_mending})</span>
            </p>
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-sky-600 uppercase tracking-wider mb-1">
              {isMeteran ? "Total Panjang" : "Total Panel"}
            </h4>
            <p className="text-sm font-black text-sky-900">
              {isMeteran ? `${group.mending_grade_a ?? 0} METER` : `${group.items?.length || 0} Panel`}
            </p>
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-sky-600 uppercase tracking-wider mb-1">Rekap Hasil</h4>
            <p className="text-sm font-black flex flex-wrap items-center gap-2">
              <span className="text-emerald-600">
                {isMeteran ? `${group.mending_grade_a ?? 0} M` : `${gradeA} A`}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-amber-500">
                {isMeteran ? `${group.mending_grade_b ?? 0} T` : `${gradeB} B`}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-rose-600">
                {isMeteran ? `${group.mending_grade_bs ?? 0} T` : `${gradeBS} BS`}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Panel List Layout */}
      <div className="pb-4">
        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          Rincian per {itemLabel}
        </h4>
        <div className="flex w-full pb-4 gap-6">
          <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
            {/* PCS Header */}
            <div className="px-4 py-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-center">
              <h5 className="font-black text-slate-700 tracking-wide text-sm flex items-center gap-2">
                PCS {group.pcs_index || group.detail?.pcs_index}
              </h5>
            </div>

            {/* PCS Table */}
            <div className="flex-1 overflow-auto bg-white p-2">
              {isMeteran ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <th className="px-1 py-2 w-7 text-center border-r border-slate-200">No</th>
                      <th className="px-2 py-2 w-24 border-r border-slate-200">Tgl</th>
                      <th className="px-1 py-2 w-12 text-center border-r border-slate-200">Group</th>
                      <th className="px-2 py-2 w-28 border-r border-slate-200">Operator</th>
                      <th className="px-1 py-2 text-center w-14 border-r border-slate-200">Meter</th>
                      <th className="px-1 py-2 text-center w-14 border-r border-slate-200">KET ✓/X</th>
                      <th className="px-3 py-2 min-w-[220px] w-full border-r border-slate-200">Keterangan Cacat</th>
                      <th className="px-2 py-2 text-center w-24">Hasil Mending</th>
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

                      let hasilMendingClass = "border-slate-200 bg-slate-50 text-slate-300";
                      if (item.hasil_mending_original === "A") hasilMendingClass = "border-emerald-500 bg-emerald-50 text-emerald-600";
                      else if (item.hasil_mending_original === "B") hasilMendingClass = "border-amber-500 bg-amber-50 text-amber-500";
                      else if (item.hasil_mending_original === "BS") hasilMendingClass = "border-rose-500 bg-rose-50 text-rose-600";

                      return (
                        <tr key={item.id || index} className="hover:bg-slate-50 transition-colors">
                          <td className="px-1 py-1.5 font-bold text-slate-800 text-center text-xs w-7 border-r border-slate-100">
                            {item.displayNo}
                          </td>
                          <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap text-xs w-24 border-r border-slate-100">
                            {item.showTgl ? item.tglStr : ""}
                          </td>
                          <td className="px-1 py-1.5 font-medium text-slate-700 text-center text-xs w-12 border-r border-slate-100">
                            {item.showGrp ? item.grpStr : ""}
                          </td>
                          <td className="px-2 py-1.5 font-medium text-slate-700 leading-tight text-xs w-28 border-r border-slate-100">
                            {item.showOpr ? item.oprStr : ""}
                          </td>
                          <td className="px-1 py-1.5 text-center font-bold text-slate-800 text-xs w-14 border-r border-slate-100">
                            {item.meterDisplay}
                          </td>
                          <td className="px-1 py-1.5 text-center font-bold text-sm w-14 border-r border-slate-100">
                            {!item.isGradable ? "" : (item.indikator_stop || item.kategori_masalah ? <span className="text-rose-600">X</span> : <span className="text-emerald-600">✓</span>)}
                          </td>
                          <td className={`px-3 py-1.5 text-[11px] font-medium whitespace-pre leading-tight border-r border-slate-100 ${(!item.isGradable || !item.hasErrorDetail) ? 'text-slate-700' : 'text-rose-600'}`}>
                            {item.cacatDisplay || "-"}
                          </td>
                          <td className="px-1 py-1.5 text-center w-24 border-b border-slate-50">
                            {item.isGradable ? (
                              <div className={`mx-auto w-6 h-6 rounded border flex items-center justify-center ${hasilMendingClass}`}>
                                <span className="text-[10px] font-black">{item.hasil_mending_original || "-"}</span>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-3 py-2 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider pb-3">
                        PNL NO
                      </th>
                      <th className="px-3 py-2 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider pb-3">
                        TGL
                      </th>
                      <th className="px-3 py-2 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider pb-3">
                        Group
                      </th>
                      <th className="px-3 py-2 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider pb-3">
                        Operator
                      </th>
                      <th className="px-3 py-2 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider pb-3 text-center">
                        QC KET
                      </th>
                      <th className="px-3 py-2 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider pb-3">
                        KETERANGAN CACAT
                      </th>
                      <th className="px-3 py-2 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider pb-3 text-center border-l border-slate-100">
                        HASIL MENDING
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(() => {
                      const sortedItems = [...(group.items || [])].sort((a: any, b: any) => {
                        const aHeader = a.header || header;
                        const bHeader = b.header || header;
                        const aPanel = aHeader.panel_no;
                        const bPanel = bHeader.panel_no;
                        if (aPanel === "METERAN" && bPanel === "METERAN") {
                          const aMeter = parseFloat(a.detail?.meter_kain ?? "");
                          const bMeter = parseFloat(b.detail?.meter_kain ?? "");
                          return (isNaN(aMeter) ? 0 : aMeter) - (isNaN(bMeter) ? 0 : bMeter);
                        }
                        if (aPanel === "METERAN") return 1;
                        if (bPanel === "METERAN") return -1;
                        const aNum = parseInt(aPanel, 10);
                        const bNum = parseInt(bPanel, 10);
                        if (!isNaN(aNum) && !isNaN(bNum) && aNum !== bNum) return aNum - bNum;
                        const panelCmp = String(aPanel || "").localeCompare(String(bPanel || ""), undefined, { numeric: true });
                        if (panelCmp !== 0) return panelCmp;
                        const aTgl = aHeader.tgl || "";
                        const bTgl = bHeader.tgl || "";
                        if (aTgl !== bTgl) return aTgl.localeCompare(bTgl);
                        const aOp = aHeader.operators?.nama_operator || aHeader.pic || "";
                        const bOp = bHeader.operators?.nama_operator || bHeader.pic || "";
                        return aOp.localeCompare(bOp);
                      });

                      const filteredItems = sortedItems.filter((item: any) => {
                        const detail = item.detail || {};
                        const itemHeader = item.header || header;
                        const isIstirahat = (detail.kategori_masalah?.includes("ISTIRAHAT") || detail.keterangan_cacat?.includes("ISTIRAHAT")) && !detail.kategori_masalah && !detail.detail_masalah;
                        if (!isIstirahat) return true;
                        
                        const hasMeter = (detail.meter_kain !== null && detail.meter_kain !== undefined && String(detail.meter_kain).trim() !== "") ||
                                         (itemHeader.meter_akhir !== null && itemHeader.meter_akhir !== undefined && String(itemHeader.meter_akhir).trim() !== "") ||
                                         (itemHeader.meter_awal !== null && itemHeader.meter_awal !== undefined && String(itemHeader.meter_awal).trim() !== "");
                        return hasMeter;
                      });

                      return filteredItems.map((item: any, idx: number) => {
                        const detail = item.detail || {};
                        const itemHeader = item.header || header;

                        const prevItem = idx > 0 ? sortedItems[idx - 1] : null;
                        const prevHeader = prevItem?.header || header;
                        const prevOp = prevItem ? (prevHeader.operators?.nama_operator || prevHeader.pic || "-") : null;
                        const prevTgl = prevItem ? (prevHeader.tgl || "-") : null;
                        const prevGrp = prevItem ? (prevHeader.groups?.nama_grup || "-") : null;

                        const currOp = itemHeader.operators?.nama_operator || itemHeader.pic || "-";
                        const currTgl = itemHeader.tgl || "-";
                        const currGrp = itemHeader.groups?.nama_grup || "-";

                        const isIstirahat = (detail.kategori_masalah?.includes("ISTIRAHAT") || detail.keterangan_cacat?.includes("ISTIRAHAT")) && !detail.kategori_masalah && !detail.detail_masalah;
                        
                        let displayOp = currOp;
                        let displayTgl = currTgl;
                        let displayGrp = currGrp;
                        
                        if (isIstirahat) {
                          displayOp = "Istirahat";
                        }
                        
                        if (idx > 0) {
                          const prevItem = sortedItems[idx - 1];
                          const prevHeader = prevItem?.header || header;
                          const prevTgl = prevHeader?.tgl || "-";
                          const prevGrp = prevHeader?.groups?.nama_grup || "-";
                          
                          if (prevTgl === currTgl) displayTgl = "";
                          if (prevGrp === currGrp) displayGrp = "";
                          
                          if (isIstirahat) {
                            displayOp = "Istirahat";
                          } else {
                            let prevActualOprStr = "-";
                            for (let k = idx - 1; k >= 0; k--) {
                               const pItem = sortedItems[k];
                               const isPItemIstirahat = (pItem.detail?.kategori_masalah?.includes("ISTIRAHAT") || pItem.detail?.keterangan_cacat?.includes("ISTIRAHAT")) && !pItem.detail?.kategori_masalah && !pItem.detail?.detail_masalah;
                               if (!isPItemIstirahat) {
                                 const pHeader = pItem.header || header;
                                 prevActualOprStr = pHeader?.operators?.nama_operator || pHeader?.pic || "-";
                                 break;
                               }
                            }
                            if (prevActualOprStr === currOp) {
                               displayOp = "";
                            }
                          }
                        }
                        
                        if (isIstirahat) {
                           displayTgl = "";
                           displayGrp = "";
                        }

                        let itemText = "-";
                        let Icon = null;
                        let iconColor = "";

                        if (detail.final_inspection_id === 1) {
                          itemText = "Bagus";
                          Icon = CheckCircle2;
                          iconColor = "text-emerald-500";
                        } else if (detail.final_inspection_id === 2 || detail.final_inspection_id === 3 || detail.final_inspection_id === 4) {
                          itemText = "Cacat";
                          Icon = XCircle;
                          iconColor = "text-rose-500";
                        }

                        let masalahLines: string[] = [];
                        if (!isIstirahat) {
                          let dtEvents: any[] = [];
                          try {
                            if (itemHeader.downtime_events) {
                              dtEvents = typeof itemHeader.downtime_events === 'string'
                                ? JSON.parse(itemHeader.downtime_events)
                                : itemHeader.downtime_events;
                            }
                          } catch (e) { }

                          const matchedEvents = dtEvents.filter((e: any) =>
                            !e.pcsKe || e.pcsKe === "Semua" || e.pcsKe == detail.pcs_index
                          );

                          if (matchedEvents.length > 0) {
                            matchedEvents.forEach((e: any) => {
                              if (e.problems && Array.isArray(e.problems)) {
                                e.problems.forEach((p: any) => {
                                  const c = p.kategori || "";
                                  let rawDetails: string[] = [];
                                  if (p.details && Array.isArray(p.details)) {
                                    rawDetails = [...p.details];
                                  } else if (typeof p.details === "string") {
                                    rawDetails = [p.details];
                                  }
                                  const b = p.blok || "";

                                  rawDetails.forEach((dItem: any) => {
                                    const d = typeof dItem === 'string' ? dItem.trim() : String(dItem);
                                    if (!d) return;
                                    let line = "";
                                    if (c && d) line = `${c} - ${d}`;
                                    else if (c) line = c;
                                    else if (d) line = d;

                                    if (b && b !== "-") {
                                      if (line) line += ` (Blok ${b})`;
                                      else line = `(Blok ${b})`;
                                    }
                                    if (line) masalahLines.push(line);
                                  });
                                });
                              } else if (e.kategori) {
                                const c = e.kategori;
                                const rawDetails = e.detail ? (Array.isArray(e.detail) ? e.detail : [e.detail]) : [];
                                const b = e.blok || "";

                                rawDetails.forEach((dItem: any) => {
                                  const d = typeof dItem === 'string' ? dItem.trim() : String(dItem);
                                  if (!d) return;
                                  let line = "";
                                  if (c && d) line = `${c} - ${d}`;
                                  else if (c) line = c;
                                  else if (d) line = d;

                                  if (b && b !== "-") {
                                    if (line) line += ` (Blok ${b})`;
                                    else line = `(Blok ${b})`;
                                  }
                                  if (line) masalahLines.push(line);
                                });
                              }
                            });
                          } else {
                            let cacatLines: string[] = [];
                            const katsRaw = detail.kategori_masalah;
                            const kats = katsRaw ? (Array.isArray(katsRaw) ? katsRaw : katsRaw.split(",").map((s: string) => s.trim())) : [];
                            const displayDetail = detail.detail_masalah || "";
                            
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
                            
                            let ketCacat = detail.keterangan_cacat || "";
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
                            
                            masalahLines.push(...cacatLines);
                          }

                          if (detail.keterangan_qc && detail.keterangan_qc !== "-") {
                            masalahLines.push(`QC: ${detail.keterangan_qc}`);
                          }
                        }
                        if (masalahLines.length === 0) masalahLines.push("-");

                        let hasilMendingClass = "border-slate-200 bg-slate-50 text-slate-300";
                        if (item.hasil_mending === "A") hasilMendingClass = "border-emerald-500 bg-emerald-50 text-emerald-600";
                        else if (item.hasil_mending === "B") hasilMendingClass = "border-amber-500 bg-amber-50 text-amber-500";
                        else if (item.hasil_mending === "BS") hasilMendingClass = "border-rose-500 bg-rose-50 text-rose-600";

                        return (
                          <tr key={item.id || idx} className="hover:bg-sky-50/30 transition-colors group">
                            <td className="px-2 py-1.5 border-b border-slate-50">
                              <span className="text-[11px] font-extrabold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                {itemHeader.panel_no === "METERAN" ? (detail.meter_kain ?? "-") : itemHeader.panel_no}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-[11px] text-slate-600 font-medium whitespace-nowrap border-b border-slate-50">
                              {displayTgl}
                            </td>
                            <td className="px-2 py-1.5 text-[11px] text-slate-600 font-medium border-b border-slate-50">
                              {displayGrp}
                            </td>
                            <td className="px-2 py-1.5 text-[11px] text-slate-600 font-medium border-b border-slate-50">
                              {displayOp}
                            </td>
                            <td className="px-2 py-1.5 text-center border-b border-slate-50">
                              {Icon ? <Icon className={`w-3.5 h-3.5 mx-auto ${iconColor}`} /> : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-2 py-1.5 text-[11px] text-rose-500 border-b border-slate-50 whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
                                {masalahLines.map((line: string, i: number) => (
                                  <span key={i} title={line}>
                                    {line}
                                  </span>
                                ))}
                              </div>
                            </td>

                            <td className="px-2 py-1.5 text-center border-b border-slate-50 border-l border-slate-100">
                             {(!isIstirahat && itemHeader.panel_no !== "START" && itemHeader.panel_no !== "FINISH" && detail.meter_kain !== "START" && detail.meter_kain !== "FINISH") ? (
                               <div className={`mx-auto w-6 h-6 rounded border flex items-center justify-center ${hasilMendingClass}`}>
                                 <span className="text-[10px] font-black">{item.hasil_mending || "-"}</span>
                               </div>
                             ) : (
                               <span className="text-slate-300">-</span>
                             )}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MendingDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[#0070bc] mb-4" />
        <span className="text-slate-500 font-medium">Memuat Halaman...</span>
      </div>
    }>
      <MendingDetailContent />
    </Suspense>
  );
}
