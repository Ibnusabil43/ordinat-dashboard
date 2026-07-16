import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getEventById } from "@/lib/queries/events";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressStepper } from "@/components/ProgressStepper";
import { StartPsikotesButton } from "@/components/admin/StartPsikotesButton";
import { ScheduleDateEditor } from "@/components/admin/ScheduleDateEditor";

/**
 * "Kelola Link" removed here (per user request) — Links is its own
 * top-level menu now (/links), no shortcut needed from Schedules.
 *
 * (User request, post-19-7): the "Edit Schedule" button/route is gone too —
 * the date itself is now edited directly in place via ScheduleDateEditor,
 * right where it used to be shown as plain text. No navigation, no second
 * page. "Mulai Psikotes" only renders once a date is actually set — you
 * can't start a test session with no date, same rule enforced server-side
 * in advanceToOngoing (events.ts).
 */
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Link
        href="/jadwal"
        className="flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Back
      </Link>

      <PageHeader
        title={event.school.name}
        description={<ScheduleDateEditor eventId={event.id} scheduledDate={event.scheduledDate} />}
        action={<StatusBadge status={event.status} size="lg" />}
      />

      {/* Status + actions */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
        <ProgressStepper status={event.status} />
        {event.status === "SCHEDULED" && event.scheduledDate && (
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-6">
            <StartPsikotesButton id={event.id} />
          </div>
        )}
      </div>
    </div>
  );
}
