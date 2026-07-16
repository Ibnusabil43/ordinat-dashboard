"use server";

/**
 * Admin sign-in / sign-out. There is no signup action — admin accounts are
 * created manually in Supabase Studio (Authentication > Add user).
 * See CLAUDE.md > Auth model.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations";
import { usernameToAuthEmail } from "@/lib/constants";
import { roleFromAppMetadata } from "@/lib/roles";

export async function signIn(
  _prevState: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Invalid username or password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToAuthEmail(parsed.data.username),
    password: parsed.data.password,
  });
  if (error) {
    return { error: "Incorrect username or password." };
  }

  // TESTER can only ever land on Monitoring (BE-H4) — honoring a ?next=
  // pointing anywhere else would just bounce them right back via
  // middleware.ts, so skip that round-trip and send them straight there.
  const role = roleFromAppMetadata(data.user.app_metadata);
  if (role === "TESTER") {
    redirect("/monitoring");
  }

  // Honor middleware's ?next= redirect target, but only if it's an internal
  // absolute path — reject protocol-relative ("//evil.com") and external
  // URLs so user input can't turn this into an open redirect. Default
  // landing is "/" (Overview) for staff.
  const next = formData.get("next");
  const destination =
    typeof next === "string" &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    next !== "/login"
      ? next
      : "/";
  redirect(destination);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
