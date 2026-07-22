"use server";

import { createClient } from "@/lib/supabase/server";

export async function getProductionPlan(nomorMc: string, potonganKe: number) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("production_plans")
      .select("*")
      .eq("nomor_mc", nomorMc)
      .eq("potongan_ke", potonganKe)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found is expected if no plan exists
        return { success: true, data: null };
      }
      throw error;
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("Error fetching production plan:", err);
    return { success: false, error: err.message };
  }
}

export async function upsertProductionPlan(data: any) {
  try {
    const supabase = await createClient();
    
    // First, check if it already exists
    const { data: existing, error: fetchError } = await supabase
      .from("production_plans")
      .select("id")
      .eq("nomor_mc", data.nomor_mc)
      .eq("potongan_ke", data.potongan_ke)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    let result;
    if (existing) {
      // Update
      const { data: updated, error } = await supabase
        .from("production_plans")
        .update(data)
        .eq("id", existing.id)
        .select()
        .single();
        
      if (error) throw error;
      result = updated;
    } else {
      // Insert
      const { data: inserted, error } = await supabase
        .from("production_plans")
        .insert(data)
        .select()
        .single();
        
      if (error) throw error;
      result = inserted;
    }

    return { success: true, data: result };
  } catch (err: any) {
    console.error("Error upserting production plan:", err);
    return { success: false, error: err.message };
  }
}

export async function getAllProductionPlans(page: number = 1, limit: number = 20, search: string = "") {
  try {
    const supabase = await createClient();
    
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    let query = supabase
      .from("production_plans")
      .select("*", { count: "exact" });
      
    if (search) {
      query = query.ilike("nomor_mc", `%${search}%`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return { success: true, data, total: count || 0 };
  } catch (err: any) {
    console.error("Error fetching all production plans:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteProductionPlan(id: string) {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from("production_plans")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    console.error("Error deleting production plan:", err);
    return { success: false, error: err.message };
  }
}

export async function getRecentPlansByMachine(nomorMc: string) {
  try {
    const supabase = await createClient();
    
    // Fetch last 20 records from ACTUAL production history
    const { data, error } = await supabase
      .from("production_headers")
      .select("potongan_ke, design_id, pick, course, no_order_barang, no_customer, jenis_benang_dasar, liner, heavy, shadow, pinggiran, rpm, tanggal_jam")
      .eq("nomor_mc", nomorMc)
      .order("tanggal_jam", { ascending: false })
      .limit(20);

    if (error) throw error;

    // Filter to get unique configurations based on potongan_ke and design_id
    const uniquePlans: any[] = [];
    const seen = new Set();
    
    if (data) {
      for (const row of data) {
        const key = `${row.potongan_ke}-${row.design_id}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniquePlans.push({
            id: row.potongan_ke + "-" + (row.design_id || ""), // synthetic ID for the dropdown
            nomor_mc: nomorMc,
            potongan_ke: row.potongan_ke,
            design_id: row.design_id,
            pick: row.pick,
            course: row.course,
            no_order_barang: row.no_order_barang,
            no_customer: row.no_customer,
            jenis_benang_dasar: row.jenis_benang_dasar,
            liner: row.liner,
            heavy: row.heavy,
            shadow: row.shadow,
            pinggiran: row.pinggiran,
            rpm: row.rpm ? String(row.rpm) : "",
          });
          if (uniquePlans.length >= 3) break;
        }
      }
    }

    return { success: true, data: uniquePlans };
  } catch (err: any) {
    console.error("Error fetching recent plans:", err);
    return { success: false, error: err.message };
  }
}
