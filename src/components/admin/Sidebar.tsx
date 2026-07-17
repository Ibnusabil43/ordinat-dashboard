"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  School,
  GraduationCap,
  CalendarDays,
  Link2,
  ClipboardList,
  FileSpreadsheet,
  CalendarRange,
  Activity,
  LogOut,
  Menu,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { signOutAction } from "@/server/actions/auth";
import type { Role } from "@/lib/roles";

/**
 * Phase 19 menu restructure — labels are English now, a scoped, confirmed
 * override of CLAUDE.md's Indonesian-UI rule for menu labels + new-feature
 * copy only (page bodies stay as they are until their own slice touches
 * them). Hrefs for not-yet-relocated menus (Schools, Schedules, Recap) still
 * point at their existing route segments — only Classes/Links/Agenda are
 * genuinely new routes (stubbed until slices 19-2/3/6 fill them in). See
 * ROADMAP.md Phase 19 for the full slice breakdown.
 */
const MENU: { href: string; label: string; icon: LucideIcon; roles: Role[] }[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard, roles: ["ADMIN", "PIC_LAPANGAN"] },
  {
    href: "/sekolah",
    label: "Schools",
    icon: School,
    roles: ["ADMIN"], // Phase 19, BE-P1: tightened from ADMIN+PIC — PIC loses School access
  },
  {
    href: "/classes",
    label: "Classes",
    icon: GraduationCap,
    roles: ["ADMIN", "PIC_LAPANGAN"],
  },
  {
    href: "/jadwal",
    label: "Schedules",
    icon: CalendarDays,
    roles: ["ADMIN", "PIC_LAPANGAN"],
  },
  {
    href: "/links",
    label: "Links",
    icon: Link2,
    roles: ["ADMIN"],
  },
  { href: "/rekap", label: "Recap", icon: ClipboardList, roles: ["ADMIN"] },
  {
    href: "/automated-recap",
    label: "Automated Recap",
    icon: FileSpreadsheet,
    roles: ["ADMIN"],
  },
  {
    href: "/agenda",
    label: "Agenda",
    icon: CalendarRange,
    roles: ["ADMIN", "PIC_LAPANGAN", "TESTER"],
  },
  {
    href: "/monitoring",
    label: "Monitoring",
    icon: Activity,
    roles: ["ADMIN", "PIC_LAPANGAN", "TESTER"],
  },
];

const DASHBOARD_TITLE: Record<Role, string> = {
  ADMIN: "Admin Dashboard",
  PIC_LAPANGAN: "PIC Dashboard",
  TESTER: "Tester Dashboard",
};

/**
 * Desktop: fixed left sidebar. Mobile: top bar + drawer. Spec: DESIGN.md §6.
 * Shared shell for all 3 roles — including TESTER, who just sees a menu
 * filtered down to "Monitoring" (the only page they're allowed on; every
 * other path still bounces them back server-side, middleware.ts).
 */
export function Sidebar({ username, role }: { username: string; role: Role }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const menu = MENU.filter((item) => item.roles.includes(role));

  const wordmark = (
    <span className="flex min-w-0 items-center gap-2">
      <Image src="/logo.png" alt="" width={24} height={24} className="shrink-0" />
      <span className="truncate text-lg font-bold tracking-tight text-zinc-900">
        {DASHBOARD_TITLE[role]}
      </span>
    </span>
  );

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {menu.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          className={clsx(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
            isActive(href)
              ? "bg-zinc-100 font-medium text-zinc-900"
              : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900",
          )}
        >
          <Icon aria-hidden="true" size={18} />
          {label}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-zinc-200 p-3">
      <div className="flex items-center gap-2 px-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200">
          <User aria-hidden="true" size={16} className="text-zinc-500" />
        </span>
        <p className="truncate text-xs text-zinc-500">{username}</p>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="mt-1 flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900"
        >
          <LogOut aria-hidden="true" size={18} />
          Sign out
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white sm:flex">
        <div className="border-b border-zinc-200 px-4 py-4">
          {wordmark}
        </div>
        {nav}
        {footer}
      </aside>

      {/* Mobile top bar */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 sm:hidden">
        {wordmark}
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100"
        >
          <Menu aria-hidden="true" size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4">
              {wordmark}
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            {nav}
            {footer}
          </div>
        </div>
      )}
    </>
  );
}
