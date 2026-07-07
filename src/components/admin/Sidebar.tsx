"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  School,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { signOutAction } from "@/server/actions/auth";

const MENU: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/sekolah", label: "Manajemen Sekolah", icon: School },
  { href: "/admin/jadwal", label: "Manajemen Jadwal", icon: CalendarDays },
  { href: "/admin/rekap", label: "Menu Rekap", icon: ClipboardList },
  { href: "/admin/automated-recap", label: "Automated Recap", icon: FileSpreadsheet },
];

/** Desktop: fixed left sidebar. Mobile: top bar + drawer. Spec: DESIGN.md §6. */
export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {MENU.map(({ href, label, icon: Icon }) => (
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
      <p className="truncate px-3 text-xs text-zinc-500">{email}</p>
      <form action={signOutAction}>
        <button
          type="submit"
          className="mt-1 flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900"
        >
          <LogOut aria-hidden="true" size={18} />
          Keluar
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white sm:flex">
        <div className="border-b border-zinc-200 px-4 py-4">
          <span className="text-lg font-bold tracking-tight text-zinc-900">Ordinat</span>
        </div>
        {nav}
        {footer}
      </aside>

      {/* Mobile top bar */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 sm:hidden">
        <span className="text-lg font-bold tracking-tight text-zinc-900">Ordinat</span>
        <button
          type="button"
          aria-label="Buka menu"
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
              <span className="text-lg font-bold tracking-tight text-zinc-900">Ordinat</span>
              <button
                type="button"
                aria-label="Tutup menu"
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
