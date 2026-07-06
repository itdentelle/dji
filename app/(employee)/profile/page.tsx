"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { KeyRound, ShieldCheck, AlertCircle } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password.length < 6) {
      setErrorMsg("Password harus minimal 6 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Konfirmasi password tidak cocok!");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      setSuccessMsg("Password berhasil diubah!");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setErrorMsg("Gagal mengubah password: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-blue-500" />
          Pengaturan Akun
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          Kelola informasi akun dan keamanan Anda.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <div className="mb-6 pb-6 border-b border-slate-100">
          <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-wider mb-4">
            Informasi Profil
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap</p>
              <p className="text-sm font-bold text-slate-700">{user?.fullName || "-"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">ID Pegawai (NIP)</p>
              <p className="text-sm font-bold text-slate-700">{user?.employeeId || "-"}</p>
            </div>
          </div>
        </div>

        <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <KeyRound className="w-4 h-4" /> Ganti Password
        </h2>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-semibold flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl text-sm font-semibold flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Password Baru
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              placeholder="Minimal 6 karakter"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Konfirmasi Password Baru
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              placeholder="Ulangi password baru"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                "Menyimpan..."
              ) : (
                <>Simpan Password</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
