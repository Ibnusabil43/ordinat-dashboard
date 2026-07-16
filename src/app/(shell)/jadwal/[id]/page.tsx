import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Link2, Pencil } from "lucide-react";
import { getEventById } from "@/lib/queries/events";
import { getCurrentRole } from "@/lib/auth-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressStepper } from "@/components/ProgressStepper";
import { StartPsikotesButton } from "@/components/admin/StartPsikotesButton";
import { resolveActiveSubtests } from "@/lib/constants";
import { formatDateID } from "@/lib/format";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, role] = await Promise.all([getEventById(id), getCurrentRole()]);
  if (!event) notFound();

  // This school's active subtests (defaults to all 13, school-level
  // setting) — only used here now for the "Kelola Link" count; the link
  // table itself moved to its own Links menu (Phase 19, FE-T2).
  const activeSubtests = resolveActiveSubtests(event.school.activeSubtests);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Link
        href="/jadwal"
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
            href={`/jadwal/${event.id}/edit`}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
          >
            <Pencil aria-hidden="true" size={16} />
            Ubah Jadwal
          </Link>
          {role === "ADMIN" && (
            <Link
              href={`/links/${event.id}`}
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
            >
              <Link2 aria-hidden="true" size={16} />
              Kelola Link ({event._count.links}/{activeSubtests.length})
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
