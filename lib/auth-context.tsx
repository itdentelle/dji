"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUserProfile } from "@/actions/user-actions";

export type UserRole = "admin" | "manager" | "employee" | "qc" | "operator" | "inspeksi" | "mending";

export interface User {
  id: string;
  fullName: string;
  employeeId: string;
  role: UserRole;
  email?: string;
  forcePasswordChange?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void; // Keep for legacy/debug purposes
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async (session: any) => {
      try {
        if (session?.user) {
          // Fetch role from user_profiles table via server action to bypass RLS issues
          const result = await getUserProfile(session.user.id);
          const profile = result.success ? result.data : null;
          const error = result.error;

          if (profile && !error) {
            const authUser: User = {
              id: session.user.id,
              email: session.user.email,
              fullName: profile.full_name,
              employeeId: profile.employee_id,
              role: profile.role as UserRole,
              forcePasswordChange: profile.force_password_change,
            };
            setUser(authUser);
            setIsLoggedIn(true);
          } else {
            setUser(null);
            setIsLoggedIn(false);
          }
        } else {
          setUser(null);
          setIsLoggedIn(false);
        }
      } catch (err) {
        console.error("Failed to fetch user:", err);
        setUser(null);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchUser(session);
    });

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          await fetchUser(session);
          
          if (event === "SIGNED_IN") {
            const currentPath = window.location.pathname;
            if (currentPath === "/login") {
              // We need to fetch role again quickly to determine redirect if not available yet
              let role = "operator";
              if (session?.user) {
                const result = await getUserProfile(session.user.id);
                if (result.success && result.data) role = result.data.role;
                
                // Cek jika butuh ganti password
                if (result?.success && result?.data?.force_password_change) {
                  router.push("/change-password");
                  return; // Hentikan eksekusi redirect normal
                }
              }
              
              if (role === "operator") {
                router.push("/input");
              } else if (role === "inspeksi") {
                router.push("/qc");
              } else if (role === "mending") {
                router.push("/mending");
              } else {
                router.push("/");
              }
            }
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setIsLoggedIn(false);
          setIsLoading(false);
          router.push("/login");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, router]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setIsLoading(false);
      return { success: false, error: error.message };
    }
    
    // session will be picked up by onAuthStateChange listener
    return { success: true };
  };

  const logout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
  };

  // Switch role for debug toolbar
  const switchRole = (role: UserRole) => {
    // This function doesn't work effectively with true Supabase Auth because 
    // it requires changing the actual backend token. 
    // However, to prevent DebugToolbar from breaking immediately:
    console.warn("switchRole is disabled when using real Supabase Auth. Please login with a different account.");
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, isLoading, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
