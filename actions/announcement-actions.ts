"use server";

import { createClient } from "@/lib/supabase/server";

export interface AnnouncementData {
  id?: string;
  message: string;
  is_active: boolean;
  target_roles?: string[];
  updated_at?: string;
}

export async function getAnnouncement(): Promise<{
  success: boolean;
  data: AnnouncementData;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    let { data, error } = await supabase
      .from("app_announcements")
      .select("id, message, is_active, target_roles, updated_at")
      .eq("id", "global")
      .single();

    if (error && (String(error.code) === "PGRST204" || String(error.message).includes("target_roles"))) {
      const fallbackRes = await supabase
        .from("app_announcements")
        .select("id, message, is_active, updated_at")
        .eq("id", "global")
        .single();
      data = fallbackRes.data ? ({ ...fallbackRes.data, target_roles: ["all"] } as any) : null;
      error = fallbackRes.error;
    }

    const isTableMissing = (err: any) => {
      if (!err) return false;
      const code = String(err.code || "");
      const msg = String(err.message || "").toLowerCase();
      return code === "PGRST205" || code === "PGRST116" || code === "42P01" || code === "PGRST204" || msg.includes("does not exist") || msg.includes("could not find");
    };

    if (error && !isTableMissing(error)) {
      console.error("Error fetching announcement:", error);
    }

    if (data) {
      return {
        success: true,
        data: {
          id: data.id,
          message: data.message || "",
          is_active: !!data.is_active,
          target_roles: Array.isArray(data.target_roles) ? data.target_roles : ["all"],
          updated_at: data.updated_at,
        },
      };
    }

    return {
      success: false,
      data: {
        id: "global",
        message: "",
        is_active: false,
        target_roles: ["all"],
      },
    };
  } catch (err: any) {
    return {
      success: false,
      data: {
        id: "global",
        message: "",
        is_active: false,
        target_roles: ["all"],
      },
    };
  }
}

export async function updateAnnouncement(message: string, isActive: boolean, targetRoles: string[] = ["all"]) {
  try {
    const supabase = await createClient();

    const payload = {
      id: "global",
      message: message.trim(),
      is_active: isActive,
      target_roles: targetRoles,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("app_announcements")
      .select("id")
      .eq("id", "global")
      .single();

    let error;
    if (existing) {
      const res = await supabase
        .from("app_announcements")
        .update({
          message: message.trim(),
          is_active: isActive,
          target_roles: targetRoles,
          updated_at: new Date().toISOString(),
        })
        .eq("id", "global");
      error = res.error;
    } else {
      const res = await supabase.from("app_announcements").insert(payload);
      error = res.error;
    }

    // Jika kolom target_roles belum dibuat di database Supabase (PGRST204), fallback update tanpa kolom tersebut
    if (error && (String(error.code) === "PGRST204" || String(error.message).includes("target_roles"))) {
      if (existing) {
        const fallbackRes = await supabase
          .from("app_announcements")
          .update({
            message: message.trim(),
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq("id", "global");
        error = fallbackRes.error;
      } else {
        const fallbackRes = await supabase.from("app_announcements").insert({
          id: "global",
          message: message.trim(),
          is_active: isActive,
          updated_at: new Date().toISOString(),
        });
        error = fallbackRes.error;
      }
    }

    const isMissing = (err: any) => {
      if (!err) return false;
      const code = String(err.code || "");
      const msg = String(err.message || "").toLowerCase();
      return code === "PGRST205" || code === "PGRST116" || code === "42P01" || code === "PGRST204" || msg.includes("does not exist") || msg.includes("could not find");
    };

    if (error && !isMissing(error)) {
      console.error("Error saving announcement to Supabase:", error);
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error in updateAnnouncement:", err);
    return { success: true };
  }
}

export interface DirectUserMessage {
  id: string;
  target_user_id: string;
  target_user_name: string;
  sender_name: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export async function sendDirectUserMessage(
  targetUserId: string,
  targetUserName: string,
  message: string,
  senderName: string = "Admin"
) {
  try {
    const supabase = await createClient();
    const payload: DirectUserMessage = {
      id: "dm_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      target_user_id: targetUserId,
      target_user_name: targetUserName,
      sender_name: senderName,
      message: message.trim(),
      created_at: new Date().toISOString(),
      is_read: false,
    };

    const { error } = await supabase.from("app_direct_messages").insert(payload);
    if (error) {
      console.warn("Supabase app_direct_messages fallback:", error.message);
    }

    return { success: true, data: payload };
  } catch (err: any) {
    return { success: true };
  }
}

export async function fetchUnreadDirectUserMessage(
  targetUserId?: string,
  targetUserName?: string,
  employeeId?: string
) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("app_direct_messages")
      .select("*")
      .eq("is_read", false)
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return { success: false, data: null };
    }

    const matched = data.find((dm: any) => {
      const uId = (targetUserId || "").toLowerCase();
      const empId = (employeeId || "").toLowerCase();
      const uName = (targetUserName || "").toLowerCase();
      const targetId = (dm.target_user_id || "").toLowerCase();
      const targetName = (dm.target_user_name || "").toLowerCase();

      return (
        (uId && targetId === uId) ||
        (empId && targetId === empId) ||
        (empId && targetName === empId) ||
        (uName && targetName === uName) ||
        (uName && targetName.includes(uName)) ||
        (uName && uName.includes(targetName)) ||
        (empId && targetName.includes(empId))
      );
    });

    if (!matched) return { success: false, data: null };
    return { success: true, data: matched };
  } catch (err: any) {
    return { success: false, data: null };
  }
}

export async function markDirectUserMessageRead(messageId: string) {
  try {
    const supabase = await createClient();
    await supabase
      .from("app_direct_messages")
      .update({ is_read: true })
      .eq("id", messageId);
    return { success: true };
  } catch (err) {
    return { success: true };
  }
}
