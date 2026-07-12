"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Search, Check, X } from "lucide-react";
import { clsx } from "clsx";
import { searchName } from "@/server/actions/monitoring";
import type { NameSearchResult } from "@/lib/queries/monitoring";

/**
 * Search input + results list (FE-P3). Submit-triggered, not on every
 * keystroke — each search hits all 12 live Sheets tabs, too expensive to
 * run on every character typed. No outer card/heading of its own — this
 * lives inside the "Cek Nama" tab on the school dashboard, which already
 * provides both.
 */
export function NameCheck({ schoolId }: { schoolId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NameSearchResult[] | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setError(undefined);
    startTransition(async () => {
      const res = await searchName(schoolId, trimmed);
      if (res === null) {
        setResults(null);
        setError("Gagal mencari. Coba lagi.");
        return;
      }
      setResults(res);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">Cari nama siswa, lihat subtes mana saja yang sudah masuk.</p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nama siswa..."
          className="h-10 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !query.trim()}
          className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Search aria-hidden="true" size={16} />
          {pending ? "Mencari..." : "Cari"}
        </button>
      </form>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {results && (
        <div className="flex flex-col gap-1.5">
          {results.map((r) => (
            <div
              key={r.code}
              className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm"
            >
              <span className="text-zinc-900">
                {r.label}
                {r.found && r.kelas && (
                  <span className="ml-2 text-xs text-zinc-500">{r.kelas}</span>
                )}
              </span>
              <span
                className={clsx(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  r.found ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-400",
                )}
                aria-label={r.found ? "Ditemukan" : "Tidak ditemukan"}
              >
                {r.found ? <Check aria-hidden="true" size={14} /> : <X aria-hidden="true" size={14} />}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
