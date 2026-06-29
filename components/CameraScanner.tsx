"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface CameraScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

export default function CameraScanner({ onScanSuccess, onScanFailure }: CameraScannerProps) {
  const [hasError, setHasError] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const startScanner = async () => {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("qr-reader");
      }

      try {
        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScanSuccess(decodedText);
          },
          (error) => {
            if (onScanFailure) onScanFailure(error);
          }
        );
        setHasError(false);
      } catch (err: any) {
        const errMsg = String(err);
        // Supress specific React StrictMode race condition error to avoid Next.js dev overlay
        if (!errMsg.includes("already under transition")) {
          console.warn("Kamera info:", err);
        }
        
        // Do not show error if the scanner managed to start anyway (React StrictMode double-call issue)
        if (scannerRef.current && (!scannerRef.current.getState || scannerRef.current.getState() !== 2)) { 
          // 2 = SCANNING state in html5-qrcode
          setHasError(true);
        }
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
        }).catch(err => {
          console.error("Gagal menghentikan kamera", err);
        });
      }
    };
  }, [onScanSuccess, onScanFailure]);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-black flex items-center justify-center min-h-[300px] relative">
      {hasError && (
        <div className="absolute z-10 text-center p-4">
          <p className="text-red-400 font-bold mb-2">Gagal mengakses kamera.</p>
          <p className="text-slate-300 text-sm">Pastikan izin kamera browser diaktifkan.</p>
        </div>
      )}
      <div id="qr-reader" className="w-full h-full" />
    </div>
  );
}
