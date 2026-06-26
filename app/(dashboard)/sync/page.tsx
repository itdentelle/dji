"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function SyncPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
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
        .limit(100);

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
    if (reports.length === 0) return alert("Belum ada data untuk disinkronkan.");
    if (!confirm(`Anda yakin ingin menyinkronkan paksa SEMUA (${reports.length}) data di halaman ini? Ini bisa memakan waktu beberapa detik.`)) return;
    
    let count = 0;
    for (const report of reports) {
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
    alert(`Berhasil sinkronisasi ulang ${count} dari ${reports.length} data.`);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Status Sinkronisasi Google Sheets</h1>
          <p className="text-muted-foreground mt-1">
            Pantau dan sinkronkan ulang data yang gagal masuk ke Google Sheets.
          </p>
        </div>
        <button
          onClick={forceSyncAll}
          disabled={syncingId !== null || loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncingId ? 'animate-spin' : ''}`} />
          Force Sync Semua Data
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-xs border-b">
              <tr>
                <th className="px-4 py-3">Tanggal & Jam</th>
                <th className="px-4 py-3">Mesin / Grup</th>
                <th className="px-4 py-3">Operator</th>
                <th className="px-4 py-3">ID Laporan</th>
                <th className="px-4 py-3 text-center">Status Sheets</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Memuat data...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Belum ada riwayat laporan.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap">{report.tanggal_jam}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {report.nomor_mc || "-"} <span className="text-slate-400">/</span> {report.groups?.nama_grup || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">{report.pic || report.operators?.nama_operator || "Unknown"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono">{report.id}</td>
                    <td className="px-4 py-3 text-center">
                      {report.is_synced_to_sheet ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Berhasil
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700">
                          <XCircle className="w-3.5 h-3.5" /> Gagal / Tertunda
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => forceSync(report.id)}
                          disabled={syncingId === report.id}
                          className={`${
                            report.is_synced_to_sheet 
                              ? "text-slate-600 hover:text-slate-800 bg-slate-100" 
                              : "text-blue-600 hover:text-blue-800 bg-blue-50"
                          } disabled:opacity-50 text-xs font-medium px-3 py-1.5 rounded-md transition-colors`}
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
