import { createClient } from "@/lib/supabase/server";

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

export const SESSION_EXPIRED_ERROR = "Sesi berakhir. Silakan masuk kembali.";
