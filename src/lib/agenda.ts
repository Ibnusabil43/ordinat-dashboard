import type { AgendaEventItem } from "@/lib/queries/events";

/**
 * Buckets events into Upcoming / This week / Past for the Agenda view
 * (Phase 19, FE-W1) — an agenda/timeline list, not a calendar grid.
 * UTC date-only comparisons throughout, consistent with how `scheduledDate`
 * is stored (UTC midnight) and formatted elsewhere (see src/lib/format.ts).
 */

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
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
  upcoming: AgendaEventItem[];
  thisWeek: AgendaEventItem[];
  past: AgendaEventItem[];
}

export function groupAgendaEvents(events: AgendaEventItem[]): AgendaGroups {
  const today = utcMidnight(new Date());
  const weekEnd = endOfWeekUTC(today);

  const upcoming: AgendaEventItem[] = [];
  const thisWeek: AgendaEventItem[] = [];
  const past: AgendaEventItem[] = [];

  for (const e of events) {
    const d = utcMidnight(e.scheduledDate);
    if (d.getTime() < today.getTime()) past.push(e);
    else if (d.getTime() <= weekEnd.getTime()) thisWeek.push(e);
    else upcoming.push(e);
  }

  // Past reads most-recent-first (look back); the other two stay
  // soonest-first (look ahead) — both already ascending from the query, so
  // only past needs reversing.
  past.reverse();

  return { upcoming, thisWeek, past };
}
