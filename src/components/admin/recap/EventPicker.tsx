"use client";

import { formatDate } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/status";
import type { RecapPickerEventOption } from "@/lib/queries/events";

/**
 * Dropdown of ONGOING/REKAP/DONE events (FE-N1, revised), rendered above
 * UploadForm inside RecapTool. REKAP/DONE entries are labeled so it's clear
 * they're a re-run, not a first pass — but they're still selectable, since
 * re-recapping an already-processed school must not be locked out. Empty
 * state when there's nothing to pick — the rest of the form stays disabled
 * in that case too (RecapTool ties formDisabled to "no event selected",
 * which is permanently true here).
 */
export function EventPicker({
  events,
  value,
  onChange,
}: {
  events: RecapPickerEventOption[];
  value: string;
  onChange: (eventId: string) => void;
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 sm:p-6">
        No school is currently testing or has finished testing yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
      <label htmlFor="eventPicker" className="mb-1.5 block text-sm font-medium text-zinc-900">
        Select Schedule
      </label>
      <select
        id="eventPicker"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none"
      >
        <option value="" disabled>
          Select a school…
        </option>
        {events.map((e) => (
          <option key={e.id} value={e.id}>
            {e.school.name} — {formatDate(e.scheduledDate)}
            {e.status !== "ONGOING" ? ` (${STATUS_LABEL[e.status]} — re-run)` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
