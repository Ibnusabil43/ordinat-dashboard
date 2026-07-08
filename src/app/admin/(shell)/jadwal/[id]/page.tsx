import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Link2 } from "lucide-react";
import { getEventById } from "@/lib/queries/events";
import { getSchoolOptions } from "@/lib/queries/schools";
import { updateEvent } from "@/server/actions/events";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressStepper } from "@/components/ProgressStepper";
import { StartPsikotesButton } from "@/components/admin/StartPsikotesButton";
import { EventForm } from "@/components/admin/EventForm";
import { formatDateID, toDateInputValue } from "@/lib/format";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, schools] = await Promise.all([getEventById(id), getSchoolOptions()]);
  if (!event) notFound();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Link
        href="/admin/jadwal"
        className="flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Kembali
      </Link>

      <PageHeader
        title={event.school.name}
        description={formatDateID(event.scheduledDate)}
        action={<StatusBadge status={event.status} size="lg" />}
      />

      {/* Status + actions */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
        <ProgressStepper status={event.status} />
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-6">
          {event.status === "SCHEDULED" && <StartPsikotesButton id={event.id} />}
          <Link
            href={`/admin/jadwal/${event.id}/link`}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
          >
            <Link2 aria-hidden="true" size={16} />
            Kelola Link ({event._count.links}/12)
          </Link>
        </div>
      </div>

      {/* Edit */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Ubah Jadwal</h2>
        <p className="mt-1 mb-4 text-sm text-zinc-500">
          Status dikelola otomatis oleh sistem dan tidak bisa diubah manual.
        </p>
        <EventForm
          action={updateEvent.bind(null, event.id)}
          schools={schools}
          initial={{
            schoolId: event.school.id,
            scheduledDate: toDateInputValue(event.scheduledDate),
          }}
          submitLabel="Simpan Perubahan"
          successRedirect={`/admin/jadwal/${event.id}`}
        />
      </div>
    </div>
  );
}
