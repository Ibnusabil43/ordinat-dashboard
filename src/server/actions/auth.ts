"use server";

/**
 * Admin sign-in / sign-out. There is no signup action — admin accounts are
 * created manually in Supabase Studio (Authentication > Add user).
 * See CLAUDE.md > Auth model.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations";

export async function signIn(
  _prevState: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Email atau password tidak valid." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Email atau password salah." };
  }

  // Honor middleware's ?next= redirect target, but only if it's an internal
  // /admin path — never redirect to an arbitrary URL from user input.
  const next = formData.get("next");
  const destination =
    typeof next === "string" && next.startsWith("/admin") && next !== "/admin/login"
      ? next
      : "/admin";
  redirect(destination);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
