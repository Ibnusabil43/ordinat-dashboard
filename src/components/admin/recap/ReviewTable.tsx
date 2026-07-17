"use client";

import type { PendingMatch } from "@/lib/recap-types";

/**
 * Confirmation table for borderline name matches (score below AUTO_CONFIDENCE
 * in the Flask matcher). Unchecked rows are treated as "not found" once
 * submitted — this mirrors the original tool's behavior exactly.
 */
export function ReviewTable({
  pending,
  decisions,
  onToggle,
  onSubmit,
  busy,
}: {
  pending: PendingMatch[];
  decisions: Record<number, boolean>;
  onToggle: (id: number) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-300 bg-white p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-zinc-900">Review Name Matches</h2>
      <p className="mt-1 text-sm text-zinc-500">
        {pending.length} name match(es) scored below 90% similarity — review and confirm before
        the scores are written to the Recap. Unchecked rows are treated as not found.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs font-medium text-zinc-500">
              <th className="px-2 py-2"></th>
              <th className="px-2 py-2">Gugus</th>
              <th className="px-2 py-2">Subtest</th>
              <th className="px-2 py-2">Name in Recap</th>
              <th className="px-2 py-2">Name in RAW</th>
              <th className="px-2 py-2">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {pending.map((p) => (
              <tr key={p.id}>
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    checked={!!decisions[p.id]}
                    onChange={() => onToggle(p.id)}
                    className="h-4 w-4 cursor-pointer accent-zinc-900"
                  />
                </td>
                <td className="px-2 py-2 text-zinc-700">Gugus {p.gugus}</td>
                <td className="px-2 py-2 text-zinc-700">{p.subtes}</td>
                <td className="px-2 py-2 font-medium text-zinc-900">{p.nama_rekap}</td>
                <td className="px-2 py-2 text-zinc-700">{p.nama_raw}</td>
                <td className="px-2 py-2">
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-900">
                    {Math.round(p.score * 100)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={busy}
        className="mt-4 flex h-10 cursor-pointer items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Submitting..." : "Confirm & Continue"}
      </button>
    </div>
  );
}
