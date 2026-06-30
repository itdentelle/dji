import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
// import { Database } from "@/types/database.types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const sessionOptions = { ...options, maxAge: undefined, expires: undefined };
              cookieStore.set(name, value, sessionOptions);
            });
          } catch {
            // Metode `setAll` dipanggil dari Server Component.
            // Ini bisa diabaikan jika middleware menangani refresh session token.
          }
        },
      },
    }
  );
}

export async function createAdminClient() {
  const cookieStore = await cookies();

  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const sessionOptions = { ...options, maxAge: undefined, expires: undefined };
              cookieStore.set(name, value, sessionOptions);
            });
          } catch {
            // Metode `setAll` dipanggil dari Server Component.
          }
        },
      },
    }
  );
}

