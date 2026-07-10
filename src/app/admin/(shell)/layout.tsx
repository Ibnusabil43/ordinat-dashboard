import { Sidebar } from "@/components/admin/Sidebar";
import { createClient } from "@/lib/supabase/server";
import { authEmailToUsername } from "@/lib/constants";

/**
 * Shell for every authenticated admin page. Deliberately NOT applied to
 * /admin/login (that route lives outside this route group) — see DESIGN.md
 * §11 (login is a bare centered card, no sidebar chrome).
 *
 * middleware.ts already redirects unauthenticated requests before this
 * layout renders, so `user` here should never be null in practice — but we
 * don't force-unwrap it, since the sidebar footer just needs a display string.
 */
export default async function AdminShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-50 sm:flex-row">
      <Sidebar username={user?.email ? authEmailToUsername(user.email) : ""} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
