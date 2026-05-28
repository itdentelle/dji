"use client";

import React, { useState } from "react";
import { loginWithPIN } from "@/actions/auth-actions";

export default function PINPad() {
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleKeyPress = (num: string) => {
    if (isLoading) return;
    setError(null);
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      
      // Jika sudah 6 digit, otomatis jalankan login
      if (newPin.length === 6) {
        triggerLogin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    if (isLoading) return;
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isLoading) return;
    setError(null);
    setPin("");
  };

  const triggerLogin = async (enteredPin: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await loginWithPIN(enteredPin);
      if (!result.success) {
        setError(result.error || "Gagal masuk.");
        setPin(""); // Reset PIN jika gagal
      }
    } catch (err) {
      setError("Terjadi kesalahan jaringan.");
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white border border-slate-100 rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.03)] flex flex-col items-center">
      {/* Brand Icon & Header */}
      <div className="text-center mb-6 flex flex-col items-center">
        <div className="w-12 h-12 rounded-2xl bg-[#0070bc]/10 border border-[#0070bc]/20 flex items-center justify-center text-[#0070bc] mb-3">
          <svg className="w-6 h-6 text-[#0070bc]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
          </svg>
        </div>
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Portal Kehadiran</h2>
        <p className="text-xs text-slate-400 font-semibold mt-1">Masukkan 6-digit PIN Anda</p>
      </div>

      {/* PIN Dots Indicator */}
      <div className="flex justify-center gap-4 my-6">
        {[...Array(6)].map((_, i) => {
          const isActive = i < pin.length;
          return (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 transform ${
                isActive
                  ? "bg-[#0070bc] border-[#0070bc] shadow-[0_0_12px_rgba(15,93,62,0.4)] scale-110"
                  : "border-slate-200 bg-transparent"
              } ${isLoading && isActive ? "animate-pulse" : ""}`}
            />
          );
        })}
      </div>

      {/* Status Loading & Error */}
      <div className="h-10 flex items-center justify-center mb-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-[#0070bc] text-xs font-bold">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Memverifikasi keamanan PIN...
          </div>
        ) : error ? (
          <div className="text-red-600 text-[11px] font-bold text-center bg-red-50 px-4 py-1.5 rounded-full border border-red-100 max-w-xs animate-shake">
            {error}
          </div>
        ) : null}
      </div>

      {/* PIN Pad Keyboard Grid */}
      <div className="grid grid-cols-3 gap-3.5 w-full">
        {/* Tombol 1-9 */}
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
          <button
            key={num}
            type="button"
            disabled={isLoading}
            onClick={() => handleKeyPress(num)}
            className="w-full h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 active:scale-95 text-xl font-bold text-slate-800 transition-all duration-100 cursor-pointer select-none"
          >
            {num}
          </button>
        ))}

        {/* Baris Bawah: Clear (C), 0, Backspace (<-) */}
        <button
          type="button"
          disabled={isLoading}
          onClick={handleClear}
          className="w-full h-14 rounded-2xl bg-red-50 hover:bg-red-100 active:scale-95 border border-red-100/60 text-xs font-extrabold text-red-600 transition-all duration-100 cursor-pointer select-none"
        >
          CLEAR
        </button>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => handleKeyPress("0")}
          className="w-full h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 active:scale-95 text-xl font-bold text-slate-800 transition-all duration-100 cursor-pointer select-none"
        >
          0
        </button>

        <button
          type="button"
          disabled={isLoading}
          onClick={handleBackspace}
          className="w-full h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 active:scale-95 text-slate-500 hover:text-slate-800 transition-all duration-100 flex items-center justify-center cursor-pointer select-none"
          aria-label="Backspace"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414A2 2 0 0110.828 5H20a2 2 0 012 2v10a2 2 0 01-2 2h-9.172a2 2 0 01-1.414-.586L3 12z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
