"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { RefreshCw, CheckCircle2, XCircle, Calendar, SlidersHorizontal, Users, RotateCcw } from "lucide-react";

export default function SyncPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [operatorsList, setOperatorsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Filters State
  const [filterDate, setFilterDate] = useState("");
  const [filterMachine, setFilterMachine] = useState("");
  const [filterOperator, setFilterOperator] = useState("");

  const supabase = createClient();

  useEffect(() => {
    fetchData();
    fetchOperators();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("production_headers" as any)
        .select(`
          *,
          groups(nama_grup),
          operators(nama_operator)
        `)
        .order("tanggal_jam", { ascending: false })
        .limit(200);

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOperators = async () => {
    try {
      const { data } = await supabase
        .from("operators")
        .select("id, nama_operator")
        .order("nama_operator", { ascending: true });
      if (data) {
        setOperatorsList(data);
      }
    } catch (err) {
      console.error("Error fetching operators:", err);
    }
  };

  const forceSync = async (headerId: string) => {
    setSyncingId(headerId);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headerId })
      });
      const result = await res.json();
      if (result.success) {
        setReports(reports.map(r => r.id === headerId ? { ...r, is_synced_to_sheet: true } : r));
        alert("Berhasil sinkronisasi ulang ke Google Sheets!");
      } else {
        alert("Gagal: " + result.error);
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan teknis");
    } finally {
      setSyncingId(null);
    }
  };

  const forceSyncAll = async () => {
    if (filteredReports.length === 0) return alert("Belum ada data untuk disinkronkan.");
    if (!confirm(`Anda yakin ingin menyinkronkan paksa ${filteredReports.length} data yang terfilter di halaman ini?`)) return;
    
    let count = 0;
    for (const report of filteredReports) {
      setSyncingId(report.id);
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headerId: report.id })
        });
        const result = await res.json();
        if (result.success) {
          count++;
          setReports(prev => prev.map(r => r.id === report.id ? { ...r, is_synced_to_sheet: true } : r));
        }
      } catch (e) {
        console.error(e);
      }
    }
    setSyncingId(null);
    alert(`Berhasil sinkronisasi ulang ${count} dari ${filteredReports.length} data.`);
  };

  // Get unique machines list dynamically from current reports dataset
  const uniqueMachines = useMemo(() => {
    const machinesSet = new Set<string>();
    reports.forEach(r => {
      if (r.nomor_mc) machinesSet.add(r.nomor_mc);
    });
    return Array.from(machinesSet).sort();
  }, [reports]);

  // Apply filters client-side
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      // 1. Date Filter
      if (filterDate) {
        const itemDateStr = report.tgl ? new Date(report.tgl).toLocaleDateString("en-CA") : "";
        if (itemDateStr !== filterDate) return false;
      }
      // 2. Machine Filter
      if (filterMachine && report.nomor_mc !== filterMachine) return false;
      // 3. Operator Filter
      if (filterOperator) {
        const opName = report.operators?.nama_operator || report.pic || "";
        if (opName !== filterOperator) return false;
      }
      return true;
    });
  }, [reports, filterDate, filterMachine, filterOperator]);

  const handleResetFilters = () => {
    setFilterDate("");
    setFilterMachine("");
    setFilterOperator("");
  };

  const formatReportDateTime = (isoString: string) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).replace(/:/g, ".");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Status Sinkronisasi Google Sheets</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pantau dan sinkronkan ulang data yang gagal masuk ke Google Sheets.
          </p>
        </div>
        <button
          onClick={forceSyncAll}
          disabled={syncingId !== null || loading || filteredReports.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 disabled:opacity-50 shadow-sm transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${syncingId ? 'animate-spin' : ''}`} />
          Force Sync Data Terfilter ({filteredReports.length})
        </button>
      </div>

      {/* Premium Filters Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white border border-[#e9ecef] rounded-2xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
        {/* Date Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Tanggal Produksi
          </label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold cursor-pointer w-full"
          />
        </div>

        {/* Machine Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" /> Mesin
          </label>
          <select
            value={filterMachine}
            onChange={(e) => setFilterMachine(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold cursor-pointer w-full"
          >
            <option value="">Semua Mesin</option>
            {uniqueMachines.map(mc => (
              <option key={mc} value={mc}>{mc}</option>
            ))}
          </select>
        </div>

        {/* Operator Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" /> Operator
          </label>
          <select
            value={filterOperator}
            onChange={(e) => setFilterOperator(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold cursor-pointer w-full"
          >
            <option value="">Semua Operator</option>
            {operatorsList.map(op => (
              <option key={op.id} value={op.nama_operator}>{op.nama_operator}</option>
            ))}
          </select>
        </div>

        {/* Reset Action */}
        <div className="flex items-end">
          <button
            onClick={handleResetFilters}
            disabled={!filterDate && !filterMachine && !filterOperator}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl border border-slate-200 transition-all cursor-pointer h-[38px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filter
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.01)] border border-[#e9ecef] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-xs border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Tanggal & Jam</th>
                <th className="px-5 py-3.5">Mesin / Grup</th>
                <th className="px-5 py-3.5">Operator</th>
                <th className="px-5 py-3.5">ID Laporan</th>
                <th className="px-5 py-3.5 text-center">Status Sheets</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-medium">
                    Memuat data...
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-medium">
                    Tidak ada riwayat laporan yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-700 font-medium">
                      {formatReportDateTime(report.tanggal_jam)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">
                      <span className="font-semibold text-slate-800">{report.nomor_mc || "-"}</span>
                      <span className="text-slate-300 mx-1.5">/</span>
                      <span className="text-xs font-bold text-slate-500 px-2 py-0.5 rounded-md bg-slate-100 uppercase">
                        {report.groups?.nama_grup || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap font-semibold text-slate-800">
                      <div className="flex flex-col">
                        <span>{report.operators?.nama_operator || report.pic || "-"}</span>
                        {report.created_by_name && (
                          <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                            PIC: {report.created_by_name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 font-mono select-all">
                      {report.id}
                    </td>
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      {report.is_synced_to_sheet ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Berhasil
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
                          <XCircle className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> Gagal / Tertunda
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => forceSync(report.id)}
                        disabled={syncingId === report.id}
                        className={`${
                          report.is_synced_to_sheet 
                            ? "text-slate-600 hover:text-slate-800 bg-slate-100 border border-slate-200/60" 
                            : "text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-100"
                        } disabled:opacity-50 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer`}
                      >
                        {syncingId === report.id ? "Menyinkronkan..." : "Sync Ulang"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
