import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes yang butuh login
const PROTECTED_ROUTES = ["/dashboard", "/admin"];
// Routes yang tidak boleh diakses kalau sudah login
const AUTH_ROUTES = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Buat Supabase client yang bisa baca/tulis cookie di edge
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Ambil session dari cookie
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  // Belum login tapi coba akses halaman protected → redirect ke login
  if (isProtected && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Sudah login tapi buka halaman login/register → redirect ke dashboard
  if (isAuthPage && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Jalankan middleware di semua route kecuali static files dan API internal
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
