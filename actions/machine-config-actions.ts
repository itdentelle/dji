"use server";

import { createClient } from "@/lib/supabase/server";

export interface MachineConfig {
  nomor_mc: string;
  default_pcs: number;
}

const DEFAULT_MACHINES: Record<string, number> = {
  R1: 1,
  R2: 1,
  R3B: 1,
  R1C: 1,
  R2C: 1,
  R11: 1,
  R12: 1,
  R16: 1,
  T1C: 1,
  T2A: 1,
  "Warping D6": 1,
  Winding: 1,
};

export async function getMachineConfigs(): Promise<{ success: boolean; data: MachineConfig[]; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("machine_configs")
      .select("nomor_mc, default_pcs");

    if (error && error.code !== "PGRST116" && !error.message.includes("does not exist")) {
      console.error("Error fetching machine_configs:", error);
    }

    const configMap = new Map<string, number>();
    if (data && Array.isArray(data)) {
      data.forEach((item: any) => {
        if (item.nomor_mc) {
          configMap.set(String(item.nomor_mc).trim().toUpperCase(), item.default_pcs || 1);
        }
      });
    }

    const ALL_MACHINES = ["R1", "R2", "R3B", "R1C", "R2C", "R11", "R12", "R16", "T1C", "T2A", "Warping D6", "Winding"];

    const results: MachineConfig[] = ALL_MACHINES.map((mc) => {
      const mcKey = mc.toUpperCase();
      const pcsFromDb = configMap.get(mcKey);
      const fallbackPcs = DEFAULT_MACHINES[mc] || 1;
      return {
        nomor_mc: mc,
        default_pcs: pcsFromDb !== undefined ? pcsFromDb : fallbackPcs,
      };
    });

    return { success: true, data: results };
  } catch (err: any) {
    console.error("Error in getMachineConfigs:", err);
    // Return fallback list if error
    const ALL_MACHINES = ["R1", "R2", "R3B", "R1C", "R2C", "R11", "R12", "R16", "T1C", "T2A", "Warping D6", "Winding"];
    const fallbackData = ALL_MACHINES.map((mc) => ({
      nomor_mc: mc,
      default_pcs: DEFAULT_MACHINES[mc] || 1,
    }));
    return { success: true, data: fallbackData };
  }
}

export async function upsertMachineConfig(nomorMc: string, defaultPcs: number) {
  try {
    const supabase = await createClient();

    const payload = {
      nomor_mc: nomorMc,
      default_pcs: defaultPcs,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("machine_configs")
      .select("nomor_mc")
      .eq("nomor_mc", nomorMc)
      .single();

    let error;
    if (existing) {
      const res = await supabase
        .from("machine_configs")
        .update({ default_pcs: defaultPcs, updated_at: new Date().toISOString() })
        .eq("nomor_mc", nomorMc);
      error = res.error;
    } else {
      const res = await supabase.from("machine_configs").insert(payload);
      error = res.error;
    }

    if (error) {
      console.error("Error saving machine config:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error in upsertMachineConfig:", err);
    return { success: false, error: err.message };
  }
}
