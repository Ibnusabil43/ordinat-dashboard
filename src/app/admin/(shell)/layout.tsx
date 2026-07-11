import { Sidebar } from "@/components/admin/Sidebar";
import { createClient } from "@/lib/supabase/server";
import { authEmailToUsername } from "@/lib/constants";
import { roleFromAppMetadata } from "@/lib/roles";

/**
 * Shell for every authenticated admin page, all 3 roles alike — including
 * TESTER, whose Sidebar just filters down to "Monitoring" (Sidebar.tsx's
 * MENU array), the only page they're allowed on. Deliberately NOT applied to
 * /admin/login (that route lives outside this route group) — see DESIGN.md
 * §11 (login is a bare centered card, no sidebar chrome).
 *
 * middleware.ts already redirects unauthenticated requests (and TESTER
 * sessions on any non-Monitoring path) before this layout renders — that's
 * the security gate, so the email/role read here is display-only, used to
 * pick the sidebar's menu + wordmark, not to make an authorization decision.
 *
 * Perf: `getClaims()` verifies the JWT locally against the project's cached
 * JWKS — no network round-trip on the happy path, unlike `getUser()` which
 * calls the Auth server (~120ms) every time. Since this is display-only and
 * middleware already validated the request, the local check is both correct
 * and safe here. See CLAUDE.md > Auth model.
 */
export default async function AdminShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null;
  const role = roleFromAppMetadata(
    data?.claims?.app_metadata as Record<string, unknown> | undefined,
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-50 sm:flex-row">
      <Sidebar username={email ? authEmailToUsername(email) : ""} role={role} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
