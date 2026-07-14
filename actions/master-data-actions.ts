"use server"

import { createClient } from "@/lib/supabase/server"

export async function getMasterData(startDate?: string, endDate?: string) {
  try {
    const supabase = await createClient();
    
    let query = supabase.from("master_data_view").select("*").order('tanggal_jam', { ascending: false });

    if (startDate) {
      query = query.gte("tanggal_produksi", startDate);
    }
    
    if (endDate) {
      query = query.lte("tanggal_produksi", endDate);
    }

    // Limit to 10000 to prevent browser crash, user should use narrower date filters if they exceed
    query = query.limit(10000);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching master data:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error("Unexpected error fetching master data:", error);
    return { success: false, error: error.message };
  }
}
