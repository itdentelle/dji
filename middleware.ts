import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            const sessionOptions = { ...options, maxAge: undefined, expires: undefined };
            response.cookies.set(name, value, sessionOptions);
          });
        },
      },
    }
  );

  // Get authenticated user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Rute publik yang dikecualikan dari pemeriksaan
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg")
  ) {
    return response;
  }

  // Jika BELUM LOGGED IN
  if (!user) {
    // Arahkan ke /login jika mencoba mengakses rute terproteksi
    if (pathname !== "/login") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  // Fetch role securely from user_profiles table if user is logged in
  let role = "employee"; // default fallback
  if (user) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { persistSession: false } }
    );

    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    
    if (profile) {
      role = profile.role;
    }
  }

  // Jika SUDAH LOGGED IN
  if (user) {
    // Cegah masuk kembali ke halaman /login
    if (pathname === "/login") {
      if (role === "operator") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } else if (role === "inspeksi") {
        return NextResponse.redirect(new URL("/qc", request.url));
      } else if (role === "mending") {
        return NextResponse.redirect(new URL("/mending", request.url));
      }
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Rute profil dan ganti password diizinkan untuk semua role
    if (pathname === "/profile" || pathname === "/change-password") {
      return response;
    }

    // Role-Based Access Control (RBAC)
    if (role === "operator") {
      // Operator hanya boleh mengakses halaman /input, /input-meter, /dashboard, /history, dan /edit
      if (
        pathname !== "/input" && 
        pathname !== "/input-meter" && 
        pathname !== "/dashboard" && 
        pathname !== "/history" &&
        !pathname.startsWith("/edit")
      ) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } else if (role === "inspeksi") {
      if (!pathname.startsWith("/qc")) {
        return NextResponse.redirect(new URL("/qc", request.url));
      }
    } else if (role === "mending") {
      if (!pathname.startsWith("/mending")) {
        return NextResponse.redirect(new URL("/mending", request.url));
      }
    }

    // Admin dan Manager memiliki akses penuh ke dashboard, chatbot, dan input form
    if (role === "manager" || role === "admin") {
      // Berikan akses
      return response;
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Cocokkan semua jalur permintaan kecuali untuk yang dimulai dengan:
     * - api (rute API)
     * - _next/static (file statis)
     * - _next/image (optimasi gambar Next.js)
     * - favicon.ico (file favicon)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
