"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

export type ProductTourStep = {
  target: string;
  title: string;
  description: string;
};

type ProductTourProps = {
  steps: ProductTourStep[];
  isOpen: boolean;
  onClose: () => void;
  accentClass?: string;
  buttonClass?: string;
};

export default function ProductTour({
  steps,
  isOpen,
  onClose,
  accentClass = "text-sky-600",
  buttonClass = "bg-[#0070bc] hover:bg-[#004777]",
}: ProductTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [tourRect, setTourRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0);
      setTourRect(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || steps.length === 0) return;

    const currentStep = steps[stepIndex];
    const element = document.querySelector(`[data-tour="${currentStep.target}"]`);

    const updateTourRect = () => {
      if (!element) {
        setTourRect(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      setTourRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };

    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }

    const timeoutId = window.setTimeout(updateTourRect, 220);
    window.addEventListener("resize", updateTourRect);
    window.addEventListener("scroll", updateTourRect, true);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", updateTourRect);
      window.removeEventListener("scroll", updateTourRect, true);
    };
  }, [isOpen, stepIndex, steps]);

  if (!isOpen || steps.length === 0) return null;

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 768;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
  const tourCardTop = tourRect ? Math.min(Math.max(tourRect.top + tourRect.height + 16, 16), Math.max(viewportHeight - 260, 16)) : 96;
  const tourCardLeft = tourRect ? Math.min(Math.max(tourRect.left, 16), Math.max(viewportWidth - 368, 16)) : 16;

  return (
    <div className="fixed inset-0 z-[70] print:hidden">
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px]" />
      {tourRect && (
        <div
          className="absolute rounded-2xl border-2 border-sky-300 bg-white/10 shadow-[0_0_0_9999px_rgba(15,23,42,0.45),0_0_0_6px_rgba(14,165,233,0.18)] transition-all duration-200 pointer-events-none"
          style={{
            top: Math.max(tourRect.top - 8, 8),
            left: Math.max(tourRect.left - 8, 8),
            width: tourRect.width + 16,
            height: tourRect.height + 16,
          }}
        />
      )}
      <div
        className="absolute w-[calc(100vw-2rem)] max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 p-5"
        style={{ top: tourCardTop, left: tourCardLeft }}
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${accentClass}`}>
              Step {stepIndex + 1} dari {steps.length}
            </p>
            <h4 className="text-base font-black text-slate-900 mt-1">{currentStep.title}</h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors shrink-0"
            aria-label="Tutup tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{currentStep.description}</p>
        <div className="flex items-center gap-2 mt-5">
          <button
            type="button"
            onClick={() => setStepIndex((step) => Math.max(step - 1, 0))}
            disabled={stepIndex === 0}
            className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
          <button
            type="button"
            onClick={isLastStep ? onClose : () => setStepIndex((step) => step + 1)}
            className={`flex-1 h-10 px-4 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${buttonClass}`}
          >
            {isLastStep ? "Selesai" : "Lanjut"}
            {!isLastStep && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
