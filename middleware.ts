import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

const canonicalAppUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ram-setu-erp-ruddy.vercel.app";
const canonicalHost = "ram-setu-erp-ruddy.vercel.app";
const legacyHosts = new Set(["setu-erp-ruddy.vercel.app"]);
const allowedHosts = new Set([
  canonicalHost,
  "localhost:3000",
  "localhost:3001",
  "127.0.0.1:3000",
  "127.0.0.1:3001"
]);

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), geolocation=(self), microphone=()");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const shouldRedirectToCanonical =
    host &&
    (legacyHosts.has(host) || !allowedHosts.has(host)) &&
    (host.endsWith(".vercel.app") || host.endsWith(".vercel.app:443"));

  if (shouldRedirectToCanonical) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = canonicalHost;
    return applySecurityHeaders(NextResponse.redirect(url, 308));
  }

  let response = NextResponse.next({
    request
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  await supabase.auth.getUser();

  return applySecurityHeaders(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
