/**
 * Supabase client for Client Components (browser). Only needed if a
 * component reads/subscribes to auth state directly; most reads should
 * happen server-side (Server Components / Server Actions) instead.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
