"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import { updateEventDate } from "@/server/actions/events";
import { formatDate, toDateInputValue } from "@/lib/format";

/**
 * Inline date editor for the Schedules detail page (user request, post-19-7)
 * — replaces the old standalone "Ubah Jadwal"/"Change Schedule" page/button.
 * Click to edit in place; no navigation, no separate route. Shows "Date not
 * set yet" when `scheduledDate` is null (every school's event is created
 * up front now, whether or not a date is known at creation time).
 */
export function ScheduleDateEditor({
  eventId,
  scheduledDate,
}: {
  eventId: string;
  scheduledDate: Date | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(scheduledDate ? toDateInputValue(scheduledDate) : "");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const cancel = () => {
    setValue(scheduledDate ? toDateInputValue(scheduledDate) : "");
    setError(undefined);
    setEditing(false);
  };

  const save = () => {
    setError(undefined);
    const fd = new FormData();
    fd.set("scheduledDate", value);
    startTransition(async () => {
      const res = await updateEventDate(eventId, undefined, fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <input
            type="date"
            autoFocus
            value={value}
            disabled={pending}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
            className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none disabled:opacity-40"
          />
          <button
            type="button"
            onClick={save}
            disabled={pending || !value}
            aria-label="Save date"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-zinc-900 text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check aria-hidden="true" size={16} />
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            aria-label="Cancel"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 transition hover:bg-zinc-50 disabled:opacity-40"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group flex cursor-pointer items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900"
    >
      {scheduledDate ? (
        <span>{formatDate(scheduledDate)}</span>
      ) : (
        <span className="text-zinc-400 italic">Date not set yet</span>
      )}
      <Pencil
        aria-hidden="true"
        size={13}
        className="text-zinc-300 transition group-hover:text-zinc-500"
      />
    </button>
  );
}
