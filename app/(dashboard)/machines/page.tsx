"use client";

import React, { useState, useEffect } from "react";
import { getMachineStatuses, MachineStatus } from "@/actions/dashboard-actions";
import { getMachineConfigs, upsertMachineConfig, MachineConfig } from "@/actions/machine-config-actions";
import { Activity, Power, Clock, RefreshCw, HelpCircle, Settings2, Save, X, Lock, User } from "lucide-react";
import ProductTour, { ProductTourStep } from "@/components/ProductTour";

const MACHINE_TOUR_STEPS: ProductTourStep[] = [
  {
    target: "machine-header",
    title: "Monitoring Mesin",
    description:
      "Pantau status mesin produksi secara real-time dan gunakan refresh jika ingin mengambil data terbaru secara manual.",
  },
  {
    target: "machine-summary",
    title: "Ringkasan Status",
    description:
      "Bagian ini merangkum total mesin aktif, mesin yang sedang beroperasi, dan mesin idle atau standby.",
  },
  {
    target: "machine-grid",
    title: "Kartu Mesin",
    description:
      "Setiap kartu menampilkan nomor mesin, operator, desain aktif, waktu input terakhir, dan status operasionalnya.",
  },
];

export default function MachineMonitoringPage() {
  const [machines, setMachines] = useState<MachineStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isTourOpen, setIsTourOpen] = useState(false);

  const [configs, setConfigs] = useState<MachineConfig[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      const res = await getMachineStatuses();
      if (res.success && res.data) {
        setMachines(res.data);
        setError(null);
        setLastRefresh(new Date());
      } else {
        setError(res.error || "Gagal memuat status mesin.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigs = async () => {
    let localData: Record<string, number> = {};
    try {
      const saved = localStorage.getItem("dji_machine_configs");
      if (saved) localData = JSON.parse(saved);
    } catch(e){}

    const res = await getMachineConfigs();
    if (res.success && res.data) {
      const merged = res.data.map((c) => ({
        ...c,
        default_pcs: localData[c.nomor_mc] !== undefined ? localData[c.nomor_mc] : c.default_pcs,
      }));
      setConfigs(merged);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    fetchStatuses();

    // Auto refresh every 60 seconds
    const interval = setInterval(() => {
      fetchStatuses();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const totalOperating = machines.filter(
    (m) => m.status === "Beroperasi",
  ).length;
  const totalIdle = machines.filter((m) => m.status === "Idle").length;
  const totalTidakAktif = machines.filter(
    (m) => m.status === "Tidak Aktif",
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      {/* Header */}
      <div
        data-tour="machine-header"
        className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            Monitoring Mesin
          </h1>
          <p className="text-slate-500 mt-1">
            Status aktivitas mesin secara real-time berdasarkan input produksi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="h-10 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300"
          >
            <Settings2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Pengaturan Default Mesin</span>
          </button>
          <button
            type="button"
            onClick={() => setIsTourOpen(true)}
            className="h-10 inline-flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-4 text-xs font-bold text-[#0070bc] shadow-sm transition-all hover:bg-sky-100"
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>Tutorial</span>
          </button>
          <div className="h-10 inline-flex items-center gap-3 bg-white px-3.5 rounded-xl border border-slate-200 shadow-sm text-xs">
            <span className="text-slate-500 font-medium">
              Update:{" "}
              <strong className="text-slate-800 font-extrabold">
                {lastRefresh
                  ? lastRefresh.toLocaleTimeString("id-ID")
                  : "Memuat..."}
              </strong>
            </span>
            <button
              onClick={fetchStatuses}
              disabled={loading}
              className={`p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              title="Refresh Data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div
        data-tour="machine-summary"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
      >
        <div className="bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 lg:gap-4">
          <div className="p-3 lg:p-4 bg-blue-50 text-blue-500 rounded-xl shrink-0">
            <Activity className="w-6 h-6 lg:w-8 lg:h-8" />
          </div>
          <div>
            <div className="text-[10px] sm:text-xs lg:text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider leading-tight">
              Total Mesin Aktif
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-800">
              {machines.length}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 lg:gap-4">
          <div className="p-3 lg:p-4 bg-emerald-50 text-emerald-500 rounded-xl shrink-0">
            <Power className="w-6 h-6 lg:w-8 lg:h-8" />
          </div>
          <div>
            <div className="text-[10px] sm:text-xs lg:text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider leading-tight">
              Beroperasi Hari Ini
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-800">
              {totalOperating}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 lg:gap-4">
          <div className="p-3 lg:p-4 bg-amber-50 text-amber-500 rounded-xl shrink-0">
            <Clock className="w-6 h-6 lg:w-8 lg:h-8" />
          </div>
          <div>
            <div className="text-[10px] sm:text-xs lg:text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider leading-tight">
              Idle / Standby
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-800">{totalIdle}</div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-8 font-medium">
          {error}
        </div>
      )}

      {/* Grid Mesin */}
      {loading && machines.length === 0 ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0070bc]"></div>
        </div>
      ) : (
        <div
          data-tour="machine-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {machines.map((machine) => (
            <div
              key={machine.mesin_id}
              className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow relative ${
                machine.status === "Tidak Aktif"
                  ? "border-slate-200 bg-slate-50/50"
                  : machine.status === "Idle"
                    ? "border-amber-200"
                    : "border-emerald-200"
              }`}
            >
              {/* Overlay for Tidak Aktif (Dimming) */}
              {machine.status === "Tidak Aktif" && (
                <div className="absolute inset-0 bg-slate-100/50 pointer-events-none z-10" />
              )}

              {/* Card Header (Status Color) */}
              <div
                className={`px-4 py-3 border-b flex justify-between items-center relative z-20 ${
                  machine.status === "Beroperasi"
                    ? "bg-emerald-50 border-emerald-100"
                    : machine.status === "Idle"
                      ? "bg-amber-50 border-amber-100"
                      : "bg-slate-100 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    {machine.status === "Beroperasi" && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-3 w-3 ${
                        machine.status === "Beroperasi"
                          ? "bg-emerald-500"
                          : machine.status === "Idle"
                            ? "bg-amber-500"
                            : "bg-slate-400"
                      }`}
                    ></span>
                  </span>
                  <span
                    className={`text-sm font-bold uppercase tracking-wider ${
                      machine.status === "Beroperasi"
                        ? "text-emerald-700"
                        : machine.status === "Idle"
                          ? "text-amber-700"
                          : "text-slate-600"
                    }`}
                  >
                    {machine.status}
                  </span>
                </div>

                {machine.last_input_time !== "-" && (
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${
                      machine.status === "Beroperasi"
                        ? "bg-white text-emerald-600 border border-emerald-100"
                        : machine.status === "Idle"
                          ? "bg-white text-amber-600 border border-amber-100"
                          : "bg-slate-100 text-slate-500 border border-slate-200 shadow-none"
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>{machine.last_input_time}</span>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-5 relative z-20">
                <div className="text-center mb-6">
                  <div className="text-sm text-slate-500 mb-1 font-medium">
                    Nomor Mesin
                  </div>
                  <div
                    className={`text-4xl font-black tracking-tight ${
                      machine.status === "Beroperasi"
                        ? "text-slate-800"
                        : machine.status === "Idle"
                          ? "text-slate-700"
                          : "text-slate-400"
                    }`}
                  >
                    {machine.mesin_id}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Operator
                    </span>
                    <span
                      className={`font-extrabold uppercase text-xs ${machine.status === "Tidak Aktif" ? "text-slate-400" : "text-slate-800"}`}
                    >
                      {machine.nama_operator}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Desain Aktif</span>
                    <span
                      className={`font-bold text-xs px-2.5 py-1 rounded-md tracking-tight ${
                        machine.status === "Beroperasi"
                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                          : machine.status === "Idle"
                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {machine.design}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-slate-400">Tgl Update</span>
                    <span className="text-slate-500 font-medium">
                      {machine.last_input_date !== "-"
                        ? machine.last_input_date
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Modal Pengaturan Default Mesin */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Pengaturan Default Parameter Mesin</h2>
                  <p className="text-xs text-slate-500 font-medium">Tentukan target PCS default untuk setiap mesin rajut.</p>
                </div>
              </div>
              <button onClick={() => setIsConfigModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <p className="text-xs text-slate-600 bg-blue-50 p-3 rounded-xl border border-blue-100">
                💡 <strong>Catatan:</strong> Nilai ini akan otomatis terisi saat Admin menambah Jadwal Produksi baru atau saat Operator menginput laporan jika belum ada jadwal khusus untuk potongan tersebut.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {configs.map((cfg, idx) => (
                  <div key={cfg.nomor_mc} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-800 text-white font-bold px-2.5 py-1 rounded text-xs">
                        {cfg.nomor_mc}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Default PCS:</span>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={cfg.default_pcs}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          const newConfigs = [...configs];
                          newConfigs[idx].default_pcs = val;
                          setConfigs(newConfigs);
                        }}
                        className="w-16 h-9 px-2 text-center rounded-lg border border-slate-300 font-black text-blue-700 bg-white focus:border-blue-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          setSavingConfig(true);
                          try {
                            const saved = localStorage.getItem("dji_machine_configs");
                            const map = saved ? JSON.parse(saved) : {};
                            map[cfg.nomor_mc] = cfg.default_pcs;
                            localStorage.setItem("dji_machine_configs", JSON.stringify(map));
                          } catch (e) {}
                          await upsertMachineConfig(cfg.nomor_mc, cfg.default_pcs);
                          setSavingConfig(false);
                          alert(`Default PCS untuk ${cfg.nomor_mc} berhasil disimpan menjadi ${cfg.default_pcs} PCS!`);
                        }}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                        title="Simpan Mesin Ini"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 shadow-sm"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      <ProductTour
        steps={MACHINE_TOUR_STEPS}
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />
    </div>
  );
}
