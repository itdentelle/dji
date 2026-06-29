"use client";

import React, { useState, useEffect } from "react";
import { getMachineStatuses, MachineStatus } from "@/actions/dashboard-actions";
import { Activity, Power, Clock, RefreshCw } from "lucide-react";

export default function MachineMonitoringPage() {
  const [machines, setMachines] = useState<MachineStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
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

  useEffect(() => {
    fetchStatuses();
    
    // Auto refresh every 60 seconds
    const interval = setInterval(() => {
      fetchStatuses();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const totalOperating = machines.filter(m => m.status === "Beroperasi").length;
  const totalIdle = machines.filter(m => m.status === "Idle").length;

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Monitoring Mesin</h1>
          <p className="text-slate-500 mt-1">Status aktivitas mesin secara real-time berdasarkan input produksi.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-sm text-slate-500">
            Terakhir update: <span className="font-semibold text-slate-700">{lastRefresh.toLocaleTimeString('id-ID')}</span>
          </div>
          <button 
            onClick={fetchStatuses}
            disabled={loading}
            className={`p-2 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-600 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-500 rounded-xl">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Total Mesin Aktif</div>
            <div className="text-3xl font-bold text-slate-800">{machines.length}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-500 rounded-xl">
            <Power className="w-8 h-8" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Beroperasi Hari Ini</div>
            <div className="text-3xl font-bold text-slate-800">{totalOperating}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 bg-amber-50 text-amber-500 rounded-xl">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Idle / Standby</div>
            <div className="text-3xl font-bold text-slate-800">{totalIdle}</div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {machines.map((machine) => (
            <div key={machine.mesin_id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Card Header (Status Color) */}
              <div className={`px-4 py-3 border-b flex justify-between items-center ${
                machine.status === 'Beroperasi' ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    {machine.status === 'Beroperasi' && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${
                      machine.status === 'Beroperasi' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}></span>
                  </span>
                  <span className={`text-sm font-bold uppercase tracking-wider ${
                    machine.status === 'Beroperasi' ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {machine.status}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-400">
                  {machine.last_input_date}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5">
                <div className="text-center mb-6">
                  <div className="text-sm text-slate-500 mb-1">Nomor Mesin</div>
                  <div className="text-3xl font-black text-slate-800 tracking-tight">{machine.mesin_id}</div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Operator</span>
                    <span className="font-semibold text-slate-800">{machine.nama_operator}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Desain Aktif</span>
                    <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{machine.design}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
