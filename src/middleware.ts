/**
 * Refreshes the Supabase session cookie on every request and gates the
 * entire app — v2.0 is fully private, there's no public content left
 * (CLAUDE.md > Auth model). This is the FIRST layer of access control —
 * every admin server action must still check auth.getUser() itself.
 *
 * Also owns two role-aware redirects that only make sense at this layer
 * since they apply across many pages at once:
 *  - root "/" has no content of its own (BE-K2) — it always redirects.
 *  - TESTER can only ever land on /admin/monitoring (BE-H4a) — every other
 *    /admin/* path bounces back there. This is a deny-everything-except
 *    shape, deliberately different from BE-H2's admin-only allow-list
 *    (see CLAUDE.md > Domain > Roles).
 *
 * Role comes from the same `user` this middleware already fetches via
 * getUser() — no second network call, and no need for auth-guard.ts's
 * next/headers-based Supabase client, which isn't edge-safe here.
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { roleFromAppMetadata } from "@/lib/roles";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/admin/login";

  if (!user) {
    if (isLoginRoute) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const role = roleFromAppMetadata(user.app_metadata);
  const roleLanding = role === "TESTER" ? "/admin/monitoring" : "/admin";

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = roleLanding;
    return NextResponse.redirect(url);
  }

  if (role === "TESTER" && pathname.startsWith("/admin") && !pathname.startsWith("/admin/monitoring")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/monitoring";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // /api is deliberately excluded, not just Next.js internals: /api/internal/*
  // is bearer-token-gated for Flask's server-to-server webhook (no Supabase
  // session ever exists on those requests — a session redirect here would
  // break the integration), and /api/admin/* already self-gates via
  // getCurrentUser()/requireStaff() with a 401 JSON response, which callers
  // expect instead of a redirect. See CLAUDE.md > Integration contract with Flask.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png).*)"],
};
