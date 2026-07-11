import { createClient } from "@/lib/supabase/server";
import { roleFromAppMetadata, type Role } from "@/lib/roles";

export type { Role };

/**
 * Returns the current authenticated Supabase user, or null.
 *
 * Every admin server action must gate on this — middleware.ts is only the
 * first layer (see CLAUDE.md > Auth model). Actions return a form-friendly
 * error object rather than throwing, so use the `SESSION_EXPIRED_ERROR`
 * message below for the "no user" case to keep wording consistent.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Same authoritative getUser() round-trip as getCurrentUser(), plus role derivation. */
export async function getCurrentRole(): Promise<Role> {
  return roleFromAppMetadata((await getCurrentUser())?.app_metadata);
}

export const SESSION_EXPIRED_ERROR = "Sesi berakhir. Silakan masuk kembali.";
export const ADMIN_ONLY_ERROR = "Menu ini khusus admin.";
export const TESTER_FORBIDDEN_ERROR = "Menu ini tidak tersedia untuk akun tester.";

/**
 * Guard for every general admin action (BE-H4b) — logged in AND not a
 * TESTER. TESTER's shape is deny-everything-except-Monitoring, not an
 * allow-list of exceptions, so this is the default guard almost every
 * action/route should use instead of bare getCurrentUser() (see CLAUDE.md >
 * Domain > Roles). Middleware already redirects TESTER away from these
 * pages/actions at the edge — this is the defense-in-depth second layer,
 * same reasoning as getCurrentUser() itself.
 */
export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) return { error: SESSION_EXPIRED_ERROR } as const;
  if (roleFromAppMetadata(user.app_metadata) === "TESTER") {
    return { error: TESTER_FORBIDDEN_ERROR } as const;
  }
  return { user } as const;
}

/**
 * Guard for the two ADMIN-only action areas (Link Management, Rekap Menu —
 * BE-H2), stricter than requireStaff() — also excludes PIC_LAPANGAN.
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: SESSION_EXPIRED_ERROR } as const;
  if (roleFromAppMetadata(user.app_metadata) !== "ADMIN") {
    return { error: ADMIN_ONLY_ERROR } as const;
  }
  return { user } as const;
}
