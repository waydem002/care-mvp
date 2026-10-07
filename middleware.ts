import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/patients") ||
    request.nextUrl.pathname.startsWith("/reminders") ||
    request.nextUrl.pathname.startsWith("/staff") ||
    request.nextUrl.pathname.startsWith("/schedule") ||
    request.nextUrl.pathname.startsWith("/tours") ||
    request.nextUrl.pathname.startsWith("/requests") ||
    request.nextUrl.pathname.startsWith("/insurance-calculator") ||
    request.nextUrl.pathname.startsWith("/documents");
  // Note: /book is deliberately NOT in this list — it's the public
  // booking-request form and must work without a login.

  if (!user && isProtectedRoute) {
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/patients/:path*",
    "/reminders/:path*",
    "/staff/:path*",
    "/schedule/:path*",
    "/tours/:path*",
    "/requests/:path*",
    "/insurance-calculator/:path*",
    "/documents/:path*",
    "/login",
  ],
};
