"use client";

import React, { useEffect, useState } from "react";
import { getAllPendingPayloads, removePendingPayload, OfflinePayload } from "@/lib/offline-store";
import { createProductionReport } from "@/actions/employee-actions";
import { submitContinuousReport } from "@/actions/continuous-actions";
import { submitQCInspection } from "@/actions/qc-actions";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function OfflineSyncManager() {
  const { isLoggedIn } = useAuth();
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);

  useEffect(() => {
    // Initial check
    setIsOffline(!navigator.onLine);
    checkPendingQueue();

    const handleOnline = () => {
      setIsOffline(false);
      processQueue();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Set interval to periodically check queue if online
    const interval = setInterval(() => {
      if (navigator.onLine && !isSyncing) {
        checkPendingQueue();
      }
    }, 15000); // 15 detik

    // Set interval to automatically sync failed sheet data
    const sheetSyncInterval = setInterval(() => {
      if (navigator.onLine && isLoggedIn) {
        autoSyncSheets();
      }
    }, 30000); // 30 detik

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
      clearInterval(sheetSyncInterval);
    };
  }, [isSyncing, isLoggedIn]);

  const checkPendingQueue = async () => {
    try {
      const items = await getAllPendingPayloads();
      setPendingCount(items.length);
      if (items.length > 0 && navigator.onLine && !isSyncing) {
        processQueue();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const autoSyncSheets = async () => {
    try {
      await fetch("/api/sync/auto", { method: "POST" });
    } catch (e) {
      console.error("Auto sync sheets error", e);
    }
  };

  const processQueue = async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      const payloads = await getAllPendingPayloads();
      if (payloads.length === 0) {
        setIsSyncing(false);
        return;
      }

      let successCount = 0;

      for (const item of payloads) {
        let result: any = { success: false, error: "" };
        
        try {
          if (item.type === "employee") {
            result = await createProductionReport(item.data);
          } else if (item.type === "continuous") {
            result = await submitContinuousReport(item.data);
          } else if (item.type === "qc") {
            result = await submitQCInspection(item.data);
          }

          if (result.success) {
            await removePendingPayload(item.id);
            successCount++;
          }
        } catch (err) {
          console.error("Gagal sync payload", item.id, err);
        }
      }

      const remaining = await getAllPendingPayloads();
      setPendingCount(remaining.length);

      if (successCount > 0) {
        setShowSuccessMsg(true);
        setTimeout(() => setShowSuccessMsg(false), 4000);
      }

    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOffline && pendingCount === 0 && !isSyncing && !showSuccessMsg) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-in fade-in slide-in-from-bottom-4">
      {isOffline && (
        <div className="flex items-center gap-2 bg-rose-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-semibold">
          <WifiOff className="w-4 h-4" />
          Offline Mode
          {pendingCount > 0 && (
            <span className="bg-white text-rose-600 px-2 rounded-full text-xs ml-1">
              {pendingCount} Antrean
            </span>
          )}
        </div>
      )}

      {isSyncing && (
        <div className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-semibold">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Menyinkronkan {pendingCount} data...
        </div>
      )}

      {showSuccessMsg && !isSyncing && !isOffline && (
        <div className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          Sinkronisasi Offline Selesai
        </div>
      )}
    </div>
  );
}
