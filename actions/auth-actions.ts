"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface AuthUser {
  fullName: string;
  employeeId: string;
  role: "admin" | "manager" | "employee";
}

export async function loginWithPIN(pin: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    // 1. Coba hubungkan ke Supabase (jika terkonfigurasi)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let dbUser: AuthUser | null = null;

    if (supabaseUrl && supabaseAnonKey && supabaseAnonKey !== "your_supabase_anon_key_here") {
      try {
        const supabase = await createClient();
        // Mencari operator yang memiliki PIN cocok di tabel `operators` jika ada kolom pin
        // Sebagai fallback/demo, jika tabel belum lengkap, kita gunakan pencocokan statis di bawah
        const { data: operatorData, error } = await (supabase
          .from("operators") as any)
          .select("*")
          .eq("pin", pin) // Asumsi kolom pin ada di tabel
          .single();

        if (operatorData && !error) {
          // Asumsi role default untuk operator dari excel adalah employee
          dbUser = {
            fullName: operatorData.nama_operator,
            employeeId: `EMP-${operatorData.id.toString().padStart(5, "0")}`,
            role: "employee",
          };
        }
      } catch (e) {
        console.warn("Supabase auth query skipped or failed:", e);
      }
    }

    // 2. Fallback pencocokan PIN standar untuk Demo
    if (!dbUser) {
      if (pin === "111111") {
        dbUser = {
          fullName: "Budi Santoso",
          employeeId: "EMP-10294",
          role: "employee",
        };
      } else if (pin === "222222") {
        dbUser = {
          fullName: "Dewi Lestari",
          employeeId: "MGR-00382",
          role: "manager",
        };
      } else if (pin === "123456" || pin === "333333") {
        dbUser = {
          fullName: "Dwiky Sumarlin",
          employeeId: "ADM-00001",
          role: "admin",
        };
      }
    }

    if (dbUser) {
      const cookieStore = await cookies();

      // Set session & role cookies
      cookieStore.set("mock_session", "active", { path: "/", maxAge: 86400, sameSite: "lax" });
      cookieStore.set("mock_role", dbUser.role, { path: "/", maxAge: 86400, sameSite: "lax" });

      return { success: true, user: dbUser };
    }

    return {
      success: false,
      error: "PIN salah! Gunakan: 111111 (Pegawai), 222222 (Manager), atau 123456 (Admin)",
    };
  } catch (err) {
    console.error("Auth action error:", err);
    return { success: false, error: "Terjadi kesalahan sistem saat memproses PIN." };
  }
}

export async function logoutSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("mock_session");
  cookieStore.delete("mock_role");
}

export async function updatePasswordAndProfile(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    // Use service role client to update profile
    const { createClient } = await import("@supabase/supabase-js");
    const adminSupabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await adminSupabase
      .from("user_profiles")
      .update({ force_password_change: false })
      .eq("id", userId);

    if (error) {
      console.error("Error updating user profile:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Exception in updatePasswordAndProfile:", err);
    return { success: false, error: err.message };
  }
}
