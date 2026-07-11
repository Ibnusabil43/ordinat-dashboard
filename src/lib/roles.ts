/**
 * 3-way role, stored in Supabase auth `app_metadata.role` (CLAUDE.md > Auth
 * model — no local Role table). Kept in its own file, separate from
 * auth-guard.ts, because middleware.ts (Edge runtime) needs this pure
 * derivation without pulling in auth-guard's `next/headers`-based Supabase
 * client, which isn't edge-safe.
 */
export type Role = "ADMIN" | "PIC_LAPANGAN" | "TESTER";

/**
 * Missing/unset `role` defaults to ADMIN — every account created before this
 * field existed stays a full admin, no backfill migration needed.
 */
export function roleFromAppMetadata(
  appMetadata: Record<string, unknown> | null | undefined,
): Role {
  const role = appMetadata?.role;
  return role === "PIC_LAPANGAN" || role === "TESTER" ? role : "ADMIN";
}
