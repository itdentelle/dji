"use client";

import React, { useState, useEffect } from "react";
import { useFieldArray, Control, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Play, Square, Timer, AlertTriangle, Plus, X, Trash2, Box } from "lucide-react";
import { ContinuousFormInput } from "@/lib/schemas";

const PROBLEM_CATEGORIES = [
  { id: "A", name: "Kode A: Masalah dan Perbaikan Benang" },
  { id: "B", name: "Kode B: Perbaikan Jarum dan Element Rajutan (Mechanical)" },
  { id: "C", name: "Kode C: Pengaturan dan Design stup" },
  { id: "D", name: "Kode D: Bahan Baku dan penggantian Benang" },
  { id: "E", name: "Kode E: Masalah Kelistrikan" },
  { id: "F", name: "Kode F: Perawatan Mesin,Perbaikan Mekanik (maintenance)" },
  { id: "G", name: "Kode G: Faktor Eksternal dan Non-Teknis" },
];

const PROBLEM_DETAILS: Record<string, string[]> = {
  A: [
    "L1,L2,L3 Benang timbul putus",
    "Benang lolos",
    "Bolong corak",
    "Benang narik/Kendor",
    "Benang Nyilang",
    "Perbaikan/Beset benang Dasar",
    "Benang Kejepit/Jebol/Kusut",
    "Jalur benang",
  ],
  B: [
    "Jarum pattern patah/bengkok",
    "Ganti Jacquard",
    "Ganti jarum Compoun Nedle, pattern",
    "Ngampul",
    "Ganti dari scaloop ke non scaloop atau sebaliknya",
    "Ngegaris/Stopline",
    "Keluar Jarum",
    "Ganti String bar",
    "Ganti PBO",
    "Pressan As beam kendor",
    "Tensi tensioner",
  ],
  C: [
    "Loading design/Ganti Design",
    "Perbaikan corak/revisi",
    "Salah ganti design",
    "Error design",
    "Proofing/PCB",
    "Ganti Tali Jacquard",
  ],
  D: [
    "Ganti Benang dasar (Matiin/Naikin Beam)",
    "Ganti Tali/Benang Timbul",
    "Ganti benang sambungan",
    "Beam Habis",
    "Cek stok benang",
  ],
  E: [
    "Masalah Listrik Utama mati",
    "Perbaikan Inverter/dinamo",
    "Korsleting (Jalur Putus)",
    "Perbaikan Sensor/limit switch",
    "Perbaikan panel kontrol",
  ],
  F: [
    "Ganti Oli",
    "Perbaikan as patah",
    "Perbaikan gear",
    "Pembersihan mesin",
    "Perbaikan Roller",
    "Ganti Bearing",
    "Ganti Panbel",
    "Perbaikan/ganti rantai",
  ],
  G: [
    "Istirahat",
    "Izin/sakit",
    "Tunggu material (benang/sparepart)",
    "Ganti Operator (Oplos Shift)",
    "Breafing",
    "Masalah Listrik Pabrik/Mati lampu",
    "Bencana alam (Banjir, Gempa, dll)",
  ],
};

interface DowntimeTrackerProps {
  control: any;
  watch: any;
  setValue?: any;
  showBlockInput?: boolean;
  showMeterInput?: boolean;
}

export default function DowntimeTracker({ control, watch, setValue, showBlockInput, showMeterInput }: DowntimeTrackerProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "downtimeEvents",
  });

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStartRef, setTimerStartRef] = useState<number | null>(null);
  const [liveTimerSeconds, setLiveTimerSeconds] = useState(0);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [tempDuration, setTempDuration] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<Record<string, string[]>>({});
  const [inputBloks, setInputBloks] = useState<Record<string, string>>({});
  const [inputMeters, setInputMeters] = useState<Record<string, string>>({});
  const [selectedPcsKeList, setSelectedPcsKeList] = useState<string[]>([]);

  const [unresolvedDowntime, setUnresolvedDowntime] = useState<any>(null);

  const currentDowntimeEvents = watch("downtimeEvents");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dji_unresolved_downtime");
      if (saved) {
        setUnresolvedDowntime(JSON.parse(saved));
      } else {
        setUnresolvedDowntime(null);
      }
    } catch (e) { }
  }, [currentDowntimeEvents?.length]);

  const pcsData = watch("pcsData") || [];
  const pcsCount = pcsData.length || 1;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerStartRef) {
      interval = setInterval(() => {
        setLiveTimerSeconds(Math.floor((Date.now() - timerStartRef) / 1000));
      }, 1000);
    } else if (!isTimerRunning) {
      setLiveTimerSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerStartRef]);

  const handleStartTimer = () => {
    setIsTimerRunning(true);
    setTimerStartRef(Date.now());
  };

  const handleStopTimer = () => {
    if (!timerStartRef) return;
    const duration = Math.floor((Date.now() - timerStartRef) / 1000);
    setIsTimerRunning(false);
    setTimerStartRef(null);
    setTempDuration(duration);

    // Pre-fill if resuming from previous shift
    if (unresolvedDowntime) {
      const problems = unresolvedDowntime.problems || [];
      const cats = problems.map((p: any) => p.kategori);
      setSelectedCategories(cats);
      const details: Record<string, string[]> = {};
      const bloks: Record<string, string> = {};
      problems.forEach((p: any) => {
        details[p.kategori] = p.details || [];
        if (p.blok) bloks[p.kategori] = p.blok;
      });
      setSelectedDetails(details);
      setInputBloks(bloks);

      if (unresolvedDowntime.pcsKe === "Semua") {
        setSelectedPcsKeList(Array.from({ length: pcsCount }).map((_, i) => (i + 1).toString()));
      } else if (unresolvedDowntime.pcsKe) {
        setSelectedPcsKeList(unresolvedDowntime.pcsKe.split(", ").map((s: string) => s.trim()));
      } else {
        setSelectedPcsKeList([]);
      }
    } else {
      setSelectedCategories([]);
      setSelectedDetails({});
      setInputBloks({});
      setSelectedPcsKeList([]);
    }

    setShowModal(true);
  };

  const handleSaveEvent = () => {
    if (selectedCategories.length === 0) return;

    const meterStr = pcsCount === 1
      ? inputMeters["1"]?.trim()
      : Object.entries(inputMeters)
        .filter(([k, v]) => selectedPcsKeList.includes(k) && v.trim() !== "")
        .map(([pcs, val]) => `PCS ${pcs}: ${val.trim()}`)
        .join(", ");

    const problems = selectedCategories.map(catId => ({
      kategori: catId,
      details: selectedDetails[catId] || [],
      blok: inputBloks[catId]?.trim() !== "" ? inputBloks[catId]?.trim() : undefined,
      meter: meterStr || undefined,
    }));

    const pcsKeStr = selectedPcsKeList.length === pcsCount
      ? "Semua"
      : selectedPcsKeList.map(x => parseInt(x)).sort((a, b) => a - b).join(", ");

    append({
      id: Date.now().toString(),
      durasiDetik: tempDuration,
      pcsKe: pcsKeStr,
      problems: problems,
    });

    setShowModal(false);

    // Hapus status tertunda (unresolved) setelah berhasil disave
    if (unresolvedDowntime) {
      setUnresolvedDowntime(null);
      localStorage.removeItem("dji_unresolved_downtime");
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 mb-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              Downtime
            </h3>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-slate-400">Total:</span>
          <p className="text-lg font-black text-orange-600">
            {formatTimer(fields.reduce((acc, curr: any) => acc + (curr.durasiDetik || 0), 0))}
          </p>
        </div>
      </div>

      {/* Banner Masalah Lanjut Shift */}
      {unresolvedDowntime && !isTimerRunning && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl mb-4 flex flex-col gap-3 animate-fadeIn">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-black text-yellow-800 uppercase">Terdapat Masalah Tertunda</h4>
              <p className="text-[10px] font-medium text-yellow-700 leading-relaxed mt-0.5">
                Shift sebelumnya meninggalkan catatan masalah yang belum selesai.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleStartTimer}
            className="flex items-center justify-center gap-2 w-full h-10 bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-xs uppercase tracking-wide rounded-xl transition-all shadow-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            Mulai Lanjutkan Perbaikan
          </button>
        </div>
      )}

      <div className={`flex flex-col ${fields.length > 0 && showMeterInput ? "md:flex-row" : ""} gap-4 items-start`}>
        <div className={`p-4 bg-orange-50 border border-orange-200 rounded-2xl w-full ${fields.length > 0 && showMeterInput ? "md:w-1/3" : ""}`}>
          {!isTimerRunning ? (
            <button
              type="button"
              onClick={handleStartTimer}
              className="flex items-center justify-center gap-2 w-full h-14 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-wide rounded-2xl transition-all shadow-md shadow-orange-500/20 active:scale-[0.98]"
            >
              <AlertTriangle className="w-5 h-5 fill-current" />
              Mulai
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="w-full bg-white border-2 border-orange-200 rounded-2xl h-14 flex items-center justify-center">
                <span className="text-2xl font-black text-orange-600 font-mono tracking-wider animate-pulse">
                  {formatTimer(liveTimerSeconds)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleStopTimer}
                className="flex items-center justify-center gap-2 w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm uppercase tracking-wide rounded-2xl transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98]"
              >
                <Play className="w-5 h-5 fill-current" />
                Stop
              </button>
            </div>
          )}
        </div>

        {fields.length > 0 && (
          <div className={`space-y-1.5 w-full ${showMeterInput ? "md:w-2/3" : ""}`}>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Riwayat Berhenti:</h4>
              <span className="bg-slate-100 text-slate-500 text-[9px] px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-wider font-bold">
                {fields.length} Kejadian
              </span>
            </div>
            <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
              {fields.map((event: any, index) => (
                <div key={event.id} className="flex flex-row items-start justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl gap-2">
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="text-[10px] font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm">
                        {formatTimer(event.durasiDetik)}
                      </span>
                      {(() => {
                        const meterStr = event.meter || (event.problems && event.problems.length > 0 ? event.problems[0]?.meter : null);

                        if (!event.pcsKe || event.pcsKe === "Semua") {
                          if (meterStr) {
                            return (
                              <span className="text-[9px] font-extrabold text-sky-600 bg-sky-50 border border-sky-100/80 px-1.5 py-0.5 rounded">
                                {meterStr.includes("PCS") ? meterStr : `Meter: ${meterStr}`}
                              </span>
                            );
                          }
                          return null;
                        }

                        const pcsArray = event.pcsKe.split(",").map((s: string) => s.trim());
                        const meterMap: Record<string, string> = {};

                        if (meterStr) {
                          if (meterStr.includes("PCS")) {
                            meterStr.split(",").forEach((m: string) => {
                              const match = m.match(/PCS (\d+):\s*(.+)/);
                              if (match) {
                                meterMap[match[1]] = match[2];
                              }
                            });
                          } else {
                            meterMap[pcsArray[0]] = meterStr;
                          }
                        }

                        return pcsArray.map((pcs: string) => (
                          <span key={pcs} className="text-[9px] font-extrabold text-sky-600 bg-sky-50 border border-sky-100/80 px-1.5 py-0.5 rounded">
                            PCS {pcs} {meterMap[pcs] ? `(${meterMap[pcs]}m)` : ""}
                          </span>
                        ));
                      })()}
                    </div>

                    {/* Handle backward compatibility for old data struct (kategori/detail as strings) */}
                    {event.kategori && typeof event.kategori === "string" && (
                      <div className="text-[11px] text-slate-650 pl-0.5 leading-relaxed break-words">
                        <span className="font-black text-slate-800">{event.kategori}:</span> {event.detail}
                        {event.blok && (
                          <span className="inline-flex font-bold text-sky-700 bg-sky-50/50 px-1 py-0.5 rounded items-center gap-0.5 text-[9px] ml-1.5 border border-sky-100/60">
                            <Box className="w-2.5 h-2.5" /> Blok {event.blok}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Handle new array-based problems struct */}
                    {event.problems && event.problems.map((prob: any, pIdx: number) => (
                      <div key={pIdx} className="pl-1.5 border-l border-slate-300/80 ml-0.5 mb-0.5 text-[11px] text-slate-650 leading-relaxed break-words flex flex-col gap-1">
                        <div>
                          <span className="font-black text-slate-850">{prob.kategori}:</span> {prob.details.join(", ")}
                          {prob.blok && (
                            <span className="inline-flex font-bold text-sky-700 bg-sky-50/50 px-1 py-0.5 rounded items-center gap-0.5 text-[9px] ml-1.5 border border-sky-100/60">
                              <Box className="w-2.5 h-2.5" /> Blok {prob.blok}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0 self-start"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Input Masalah */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                  <Timer className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm sm:text-base">Simpan Downtime</h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Waktu terhenti: <span className="font-bold text-orange-600">{formatTimer(tempDuration)}</span></p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4 sm:space-y-5">
              {pcsCount > 1 && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 shadow-inner">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
                    Masalah terjadi pada PCS ke-berapa?
                  </label>
                  <p className="text-[9px] text-slate-400 font-semibold mb-3">
                    Ketuk untuk memilih/melepas pilihan PCS. Masalah harus terjadi minimal pada 1 PCS.
                  </p>
                  <div className={`grid gap-2 w-full ${pcsCount === 2 ? "grid-cols-2" :
                    pcsCount === 3 ? "grid-cols-3" :
                      pcsCount === 4 ? "grid-cols-4" :
                        pcsCount === 5 ? "grid-cols-5" :
                          "grid-cols-3 sm:grid-cols-6"
                    }`}>
                    {Array.from({ length: pcsCount }).map((_, idx) => {
                      const val = (idx + 1).toString();
                      const isSelected = selectedPcsKeList.includes(val);
                      return (
                        <div key={idx} className="flex flex-col gap-1.5 w-full">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPcsKeList((prev) => {
                                if (prev.includes(val)) {
                                  // Hapus meter input juga jika unselect
                                  setInputMeters((m) => {
                                    const next = { ...m };
                                    delete next[val];
                                    return next;
                                  });
                                  return prev.filter((x) => x !== val);
                                } else {
                                  return [...prev, val];
                                }
                              });
                            }}
                            className={`w-full h-12 flex items-center justify-center rounded-xl text-xs font-black transition-all border shadow-sm ${isSelected
                              ? "bg-sky-500 border-sky-500 text-white"
                              : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                              }`}
                          >
                            {idx + 1}
                          </button>
                          {showMeterInput && isSelected && (
                            <input
                              type="text"
                              value={inputMeters[val] || ""}
                              onChange={(e) => setInputMeters(prev => ({ ...prev, [val]: e.target.value }))}
                              placeholder="Meter..."
                              className="w-full h-8 px-2 text-center rounded-lg border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-[10px] font-bold text-slate-700 bg-emerald-50 animate-fadeIn"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {pcsCount > 1 && selectedPcsKeList.length === 0 && (
                    <p className="text-[10px] text-red-500 font-bold mt-2 animate-pulse">
                      * Wajib memilih minimal 1 PCS yang bermasalah!
                    </p>
                  )}
                </div>
              )}

              {showMeterInput && pcsCount === 1 && (
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200/60 shadow-sm animate-fadeIn">
                  <label className="text-[10px] font-black text-emerald-800 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                    <Box className="w-4 h-4" />
                    Posisi Letak Meter (Wajib Diisi)
                  </label>
                  <p className="text-[9px] text-emerald-600/80 font-semibold mb-3">
                    Isi dengan angka desimal, misal 15.5 atau 20
                  </p>
                  <input
                    type="text"
                    value={inputMeters["1"] || ""}
                    onChange={(e) => setInputMeters(prev => ({ ...prev, "1": e.target.value }))}
                    placeholder="Contoh: 15.5"
                    className="w-full h-11 px-4 rounded-xl border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-slate-700 placeholder:font-medium placeholder:text-slate-400 bg-white shadow-inner transition-all"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase mb-2 block">Pilih Kategori Masalah</label>
                <div className="grid grid-cols-1 gap-2">
                  {PROBLEM_CATEGORIES.map((cat) => (
                    <div key={cat.id} className="flex flex-col gap-2">
                      <label className="cursor-pointer">
                        <input
                          type="checkbox"
                          name="kategori"
                          value={cat.id}
                          checked={selectedCategories.includes(cat.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategories((prev) => [...prev, cat.id]);
                            } else {
                              setSelectedCategories((prev) => prev.filter((c) => c !== cat.id));
                              // Remove details and blok for this category
                              setSelectedDetails((prev) => {
                                const next = { ...prev };
                                delete next[cat.id];
                                return next;
                              });
                              setInputBloks((prev) => {
                                const next = { ...prev };
                                delete next[cat.id];
                                return next;
                              });
                            }
                          }}
                          className="peer sr-only"
                        />
                        <div className="p-3 rounded-xl border-2 border-slate-100 bg-white text-sm font-semibold text-slate-600 peer-checked:border-sky-500 peer-checked:bg-sky-50 peer-checked:text-sky-700 transition-all hover:border-slate-300">
                          {cat.name}
                        </div>
                      </label>

                      {selectedCategories.includes(cat.id) && PROBLEM_DETAILS[cat.id] && (
                        <div className="pl-4 pr-2 py-2 border-l-2 border-sky-200 ml-2 animate-in slide-in-from-top-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Pilih Detail Masalah</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {PROBLEM_DETAILS[cat.id].map((detail) => (
                              <label key={detail} className="cursor-pointer">
                                <input
                                  type="checkbox"
                                  name={`detail-${cat.id}`}
                                  value={detail}
                                  checked={selectedDetails[cat.id]?.includes(detail) || false}
                                  onChange={(e) => {
                                    const current = selectedDetails[cat.id] || [];
                                    if (e.target.checked) {
                                      setSelectedDetails((prev) => ({
                                        ...prev,
                                        [cat.id]: [...current, detail],
                                      }));
                                    } else {
                                      setSelectedDetails((prev) => ({
                                        ...prev,
                                        [cat.id]: current.filter((d) => d !== detail),
                                      }));
                                    }
                                  }}
                                  className="peer sr-only"
                                />
                                <div className="p-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-550 peer-checked:bg-sky-500 peer-checked:border-sky-500 peer-checked:text-white transition-all hover:bg-slate-50 text-center">
                                  {detail}
                                </div>
                              </label>
                            ))}
                          </div>

                          {showBlockInput !== false && (cat.id === "A" || cat.id === "B") && selectedDetails[cat.id]?.length > 0 && (
                            <div className="mt-3 p-3 bg-sky-50 border border-sky-100 rounded-xl">
                              <label className="text-[10px] font-bold text-sky-800 uppercase mb-1.5 block flex items-center gap-1.5">
                                <Box className="w-3 h-3" />
                                Lokasi / Nomor Blok (Khusus A & B)
                              </label>
                              <input
                                type="text"
                                value={inputBloks[cat.id] || ""}
                                onChange={(e) => setInputBloks((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                                placeholder="Contoh: 15, atau 1-61"
                                className="w-full h-10 px-3 rounded-lg border border-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs font-bold text-slate-700 placeholder:font-medium placeholder:text-slate-400 bg-white"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 h-12 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEvent}
                disabled={
                  selectedCategories.length === 0 ||
                  selectedCategories.some(cat => !selectedDetails[cat] || selectedDetails[cat].length === 0) ||
                  (pcsCount > 1 && selectedPcsKeList.length === 0) ||
                  (showMeterInput === true && (
                    pcsCount === 1
                      ? (!inputMeters["1"] || inputMeters["1"].trim() === "")
                      : selectedPcsKeList.some(pcs => !inputMeters[pcs] || inputMeters[pcs].trim() === "")
                  ))
                }
                className="flex-[2] h-12 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {unresolvedDowntime ? "Selesaikan Perbaikan" : "Simpan Masalah"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
