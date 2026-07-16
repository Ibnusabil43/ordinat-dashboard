import type { AgendaEventItem } from "@/lib/queries/events";

/**
 * Buckets events into Upcoming / This week / Past for the Agenda view
 * (Phase 19, FE-W1) — an agenda/timeline list, not a calendar grid.
 * UTC date-only comparisons throughout, consistent with how `scheduledDate`
 * is stored (UTC midnight) and formatted elsewhere (see src/lib/format.ts).
 */

export function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** "Today" / "Tomorrow" / "Yesterday" / "In N days" / "N days ago" — the Agenda redesign's per-row caption, cheaper to scan than a second absolute date. */
export function relativeDayLabel(date: Date): string {
  const diffDays = Math.round(
    (utcMidnight(date).getTime() - utcMidnight(new Date()).getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return diffDays > 0 ? `In ${diffDays} days` : `${Math.abs(diffDays)} days ago`;
}

/** The coming (or current, if today is Sunday) Sunday — end of the Mon–Sun week containing `today`. */
function endOfWeekUTC(today: Date): Date {
  const day = today.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + daysUntilSunday);
  return end;
}

export interface AgendaGroups {
  /** No scheduledDate yet — every school's event is created up front now (user request, post-19-7), some just don't have a date set. Surfaced first — most actionable. */
  unscheduled: AgendaEventItem[];
  upcoming: AgendaEventItem[];
  thisWeek: AgendaEventItem[];
  past: AgendaEventItem[];
}

export function groupAgendaEvents(events: AgendaEventItem[]): AgendaGroups {
  const today = utcMidnight(new Date());
  const weekEnd = endOfWeekUTC(today);

  const unscheduled: AgendaEventItem[] = [];
  const upcoming: AgendaEventItem[] = [];
  const thisWeek: AgendaEventItem[] = [];
  const past: AgendaEventItem[] = [];

  for (const e of events) {
    if (!e.scheduledDate) {
      unscheduled.push(e);
      continue;
    }
    const d = utcMidnight(e.scheduledDate);
    if (d.getTime() < today.getTime()) past.push(e);
    else if (d.getTime() <= weekEnd.getTime()) thisWeek.push(e);
    else upcoming.push(e);
  }

  // Past reads most-recent-first (look back); the other two stay
  // soonest-first (look ahead) — both already ascending from the query, so
  // only past needs reversing.
  past.reverse();

  return { unscheduled, upcoming, thisWeek, past };
}
