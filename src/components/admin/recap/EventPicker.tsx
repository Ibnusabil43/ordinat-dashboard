"use client";

import { formatDateID } from "@/lib/format";
import type { OngoingEventOption } from "@/lib/queries/events";

/**
 * Dropdown of ONGOING events (FE-N1), rendered above UploadForm inside
 * RecapTool. Empty state when there's nothing to pick — the rest of the
 * form stays disabled in that case too (RecapTool ties formDisabled to
 * "no event selected", which is permanently true here).
 */
export function EventPicker({
  events,
  value,
  onChange,
}: {
  events: OngoingEventOption[];
  value: string;
  onChange: (eventId: string) => void;
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 sm:p-6">
        Tidak ada sekolah yang sedang psikotes saat ini.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
      <label htmlFor="eventPicker" className="mb-1.5 block text-sm font-medium text-zinc-900">
        Pilih Jadwal
      </label>
      <select
        id="eventPicker"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none"
      >
        <option value="" disabled>
          Pilih sekolah…
        </option>
        {events.map((e) => (
          <option key={e.id} value={e.id}>
            {e.school.name} — {formatDateID(e.scheduledDate)}
          </option>
        ))}
      </select>
    </div>
  );
}
