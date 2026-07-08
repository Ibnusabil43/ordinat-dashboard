"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, School as SchoolIcon } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { formatDateID } from "@/lib/format";
import type { SchoolListItem } from "@/lib/queries/schools";

/**
 * Search bar + responsive school card grid for the public Home (FE-B1/B2).
 * Client-side filter only — dataset is small (a handful of schools), no
 * server round-trip needed per the story note.
 */
export function SchoolGrid({ schools }: { schools: SchoolListItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter((s) => s.name.toLowerCase().includes(q));
  }, [schools, query]);

  return (
    <div className="flex flex-col gap-6">
      <div className="relative max-w-md">
        <Search
          aria-hidden="true"
          size={18}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama sekolah…"
          aria-label="Cari sekolah"
          className="h-10 w-full rounded-lg border border-zinc-300 bg-white pr-3 pl-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SchoolIcon}
          title={schools.length === 0 ? "Belum ada sekolah terdaftar" : "Sekolah tidak ditemukan"}
          description={
            schools.length === 0
              ? "Jadwal psikotes akan muncul di sini setelah admin menambahkannya."
              : `Tidak ada sekolah dengan nama "${query}".`
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const event = s.events[0];
            return (
              <Link
                key={s.id}
                href={`/sekolah/${s.slug}`}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm sm:p-6"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-zinc-900">{s.name}</h2>
                  {event && <StatusBadge status={event.status} />}
                </div>
                {event ? (
                  <div className="text-sm text-zinc-500">
                    <p>{formatDateID(event.scheduledDate)}</p>
                    <p className="mt-0.5">{event._count.links}/12 link tersedia</p>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">Belum dijadwalkan</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
