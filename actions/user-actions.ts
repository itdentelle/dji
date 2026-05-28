"use server";

import { createClient } from "@supabase/supabase-js";

export async function getUserProfile(userId: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Gunakan service role key untuk bypass RLS jika policy belum ada
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("user_profiles")
      .select("full_name, employee_id, role")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching user profile in server action:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("Exception in getUserProfile:", err);
    return { success: false, error: err.message };
  }
}
