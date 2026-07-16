/**
 * Refreshes the Supabase session cookie on every request and gates the
 * entire app — the whole app is private, there's no public content left
 * (CLAUDE.md > Auth model). This is the FIRST layer of access control —
 * every admin server action must still check auth.getUser() itself.
 *
 * URLs have no /admin prefix — the app is all-private, so the segment was
 * redundant. Pages live at the root: "/" is Overview, "/monitoring",
 * "/jadwal", etc. "/login" is the one path reachable while logged out.
 *
 * Owns the one role-aware redirect that only makes sense at this layer
 * (it spans every page): TESTER can only ever be on /monitoring or /agenda
 * (BE-H4a, widened in Phase 19 — Agenda is view-only and open to all three
 * roles) — every other path, "/" included, bounces to /monitoring.
 * Deny-everything-except, deliberately different from BE-H2's admin-only
 * allow-list (CLAUDE.md > Domain > Roles) — this stays an explicit allow-list
 * of the two paths, not a deny-list, even as the list grows. Non-TESTER
 * roles land on "/" (Overview) directly, so no root redirect is needed
 * anymore — the page renders in place.
 *
 * Role comes from the same JWT claims this middleware already reads via
 * getClaims() — no extra call, and no need for auth-guard.ts's
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

  // getClaims() verifies the JWT locally against the project's cached JWKS —
  // no network round-trip on the happy path, unlike getUser() which calls the
  // Auth server (~100-200ms) on EVERY request (every navigation + asset). It
  // still refreshes an expired session cookie: getClaims() reads the session
  // via getSession() internally, which auto-refreshes and re-writes the cookie
  // through the setAll handler above. Same trade-off the shell layout already
  // makes (see layout.tsx) — safe here because access control is
  // defense-in-depth: every admin server action re-checks auth itself.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/login";

  if (!claims) {
    if (isLoginRoute) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const role = roleFromAppMetadata(claims.app_metadata as Record<string, unknown> | undefined);

  // TESTER can only ever be on Monitoring or the (Phase 19) view-only
  // Agenda — bounce everything else, including "/" (Overview) and "/login".
  // Non-TESTER roles fall through and get "/" (Overview) or whatever page
  // they navigated to, rendered in place.
  const TESTER_ALLOWED_PREFIXES = ["/monitoring", "/agenda"];
  if (role === "TESTER" && !TESTER_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/monitoring";
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
  //
  // logo.png is exempted alongside icon.png/favicon.ico (Phase 11) — the
  // login page renders it while logged out, and Next's image optimizer
  // fetches the source from this same origin, so redirecting the request
  // to /login instead of serving it broke the image entirely.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png|logo.png).*)"],
};
