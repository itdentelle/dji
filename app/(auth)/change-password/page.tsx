"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updatePasswordAndProfile } from "@/actions/auth-actions";
import { useAuth } from "@/lib/auth-context";
import { RefreshCw, KeyRound, CheckCircle2 } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, isLoggedIn, isLoading: authLoading, logout } = useAuth();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // If auth is loaded and user is not logged in, redirect to login
    if (!authLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    if (!password || !confirmPassword) {
      setError("Semua field wajib diisi.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password dan Konfirmasi Password tidak cocok.");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      
      // Update password using client auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw updateError;
      }

      // If successful, update user_profiles via server action
      if (user?.id) {
        const result = await updatePasswordAndProfile(user.id);
        if (!result.success) {
          throw new Error(result.error || "Gagal mengupdate profil.");
        }
      }

      setSuccess(true);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        if (user?.role === "operator") router.push("/input");
        else if (user?.role === "inspeksi") router.push("/qc");
        else if (user?.role === "mending") router.push("/mending");
        else router.push("/");
      }, 2000);

    } catch (err: any) {
      setError(err.message || "Gagal mengganti password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><RefreshCw className="animate-spin w-8 h-8 text-[#0070bc]" /></div>;

  return (
    <div className="flex-1 min-h-screen w-full bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-[#0070bc]/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-sky-400/15 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
      
      <div className="w-full max-w-md p-8 sm:p-10 bg-white/70 backdrop-blur-xl border border-white shadow-[0_8px_32px_rgba(0,0,0,0.06)] rounded-[32px] flex flex-col items-center z-10 relative">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/30 flex items-center justify-center text-white mb-4">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Ubah Password</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">Anda wajib mengubah password default Anda</p>
        </div>

        {success ? (
          <div className="w-full flex flex-col items-center justify-center py-6 text-center animate-fadeIn">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
            <h3 className="text-lg font-bold text-slate-800">Berhasil!</h3>
            <p className="text-sm text-slate-500 mt-2">Password Anda telah diubah. Mengalihkan ke dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">Password Baru</label>
              <input
                suppressHydrationWarning
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                placeholder="••••••••"
                className="w-full h-12.5 rounded-2xl bg-white/80 border border-slate-200 px-4 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-4 focus:ring-[#0070bc]/15 focus:border-[#0070bc] transition-all"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">Konfirmasi Password Baru</label>
              <input
                suppressHydrationWarning
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                placeholder="••••••••"
                className="w-full h-12.5 rounded-2xl bg-white/80 border border-slate-200 px-4 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-4 focus:ring-[#0070bc]/15 focus:border-[#0070bc] transition-all"
              />
            </div>

            <div className="min-h-[40px] flex items-center justify-center my-2">
              {isSubmitting ? (
                <div className="flex items-center gap-2 text-[#0070bc] text-xs font-bold">
                  <RefreshCw className="animate-spin h-4 w-4" /> Memperbarui...
                </div>
              ) : error ? (
                <div className="text-red-600 text-[11px] font-bold text-center bg-red-50 px-4 py-2 rounded-xl border border-red-100 w-full animate-shake">
                  {error}
                </div>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12.5 rounded-2xl bg-gradient-to-r from-[#004777] to-[#0070bc] hover:to-[#00a2ff] active:scale-[0.98] text-white font-bold transition-all duration-300 shadow-lg shadow-[#0070bc]/25 disabled:opacity-50"
            >
              Simpan Password
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isSubmitting}
              className="w-full h-10 mt-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-all text-xs"
            >
              Keluar (Logout)
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
