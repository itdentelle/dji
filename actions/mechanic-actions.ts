"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitMechanicDowntime(data: {
  nomorMc: string;
  operatorId: string;
  groupId: string;
  designId: string;
  tanggalProduksi: string;
  potonganKe: string;
  downtimeEvent: any;
  createdTime?: number | string;
}) {
  try {
    const supabase = await createClient();

    // 1. Generate unique header ID for this dummy header
    const headerId = `mekanik-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

    // 2. Prepare header data
    const operatorIdNum = data.operatorId && !isNaN(parseInt(data.operatorId)) ? parseInt(data.operatorId) : null;
    let groupIdNum: number | null = null;
    if (data.groupId) {
      const parsed = parseInt(data.groupId);
      if (!isNaN(parsed)) {
        groupIdNum = parsed;
      } else {
        const str = String(data.groupId).toUpperCase();
        if (str.includes("A")) groupIdNum = 1;
        else if (str.includes("B")) groupIdNum = 2;
        else if (str.includes("C")) groupIdNum = 3;
      }
    }
    const potonganKeNum = data.potonganKe && !isNaN(parseInt(data.potonganKe)) ? parseInt(data.potonganKe) : null;

    const tgl = data.tanggalProduksi || new Date().toISOString().split("T")[0];
    const now = new Date();
    let eventDate = now;
    if (data.createdTime) {
      const parsed = new Date(data.createdTime);
      if (!isNaN(parsed.getTime())) {
        eventDate = parsed;
      }
    }
    const utcMs = eventDate.getTime() + (eventDate.getTimezoneOffset() * 60000);
    const wibMs = utcMs + (7 * 3600 * 1000);
    const tanggalJam = new Date(wibMs).toISOString().replace('Z', '+07:00');

    const dt = data.downtimeEvent;
    const durasiSec = (dt && dt.durasiDetik && !isNaN(parseInt(dt.durasiDetik))) ? parseInt(dt.durasiDetik) : 0;
    
    // We will inject a dummy production_headers just for this downtime
    const headerPayload = {
      id: headerId,
      tgl,
      tanggal_jam: tanggalJam,
      operator_id: operatorIdNum,
      group_id: groupIdNum,
      design_id: data.designId || null,
      nomor_mc: data.nomorMc || null,
      potongan_ke: potonganKeNum,
      panel_no: "Downtime Mekanik (Direct)", // Special marker for dummy header
      pcs: 0, // no pieces
      total_downtime_detik: durasiSec,
      downtime_events: JSON.stringify([dt])
    };

    const { error: headerError } = await supabase
      .from("production_headers")
      .insert(headerPayload);

    if (headerError) {
      console.error("Error inserting mechanic dummy header:", headerError);
      return { success: false, error: headerError.message };
    }

    // 3. Prepare downtime_records data
    const downtimeRecordsData: any[] = [];
    if (dt.problems && Array.isArray(dt.problems)) {
      dt.problems.forEach((p: any) => {
        downtimeRecordsData.push({
          header_id: headerId,
          kategori: p.kategori || dt.kategori,
          detail: p.details ? (Array.isArray(p.details) ? p.details.join(", ") : p.details) : dt.detail,
          durasi_detik: durasiSec,
          blok: p.blok || dt.blok || null,
          dikerjakan_oleh: dt.dikerjakanOleh || null
        });
      });
    } else if (dt.kategori) {
      downtimeRecordsData.push({
        header_id: headerId,
        kategori: dt.kategori,
        detail: dt.detail,
        durasi_detik: durasiSec,
        blok: dt.blok || null,
        dikerjakan_oleh: dt.dikerjakanOleh || null
      });
    }

    if (downtimeRecordsData.length > 0) {
      const { error: dtError } = await supabase
        .from("downtime_records")
        .insert(downtimeRecordsData);

      if (dtError) {
        console.error("Error inserting mechanic downtime_records:", dtError);
        return { success: false, error: dtError.message };
      }
    }

    return { success: true, headerId };
  } catch (error: any) {
    console.error("Exception in submitMechanicDowntime:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}
