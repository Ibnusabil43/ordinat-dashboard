import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { getSchoolBySlug } from "@/lib/queries/schools";
import { SUBTEST_TYPES } from "@/lib/constants";
import { formatDateID, buildLinkCopyText } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressStepper } from "@/components/ProgressStepper";
import { EmptyState } from "@/components/EmptyState";
import { LinkTable, type LinkRow } from "@/components/LinkTable";
import { CopyLinksButton } from "@/components/CopyLinksButton";

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);
  if (!school) notFound();

  const event = school.events[0];

  // Merge the 12 canonical subtests with whatever links this event has saved
  // so far, in canonical order — mirrors the admin LinkForm's approach.
  const rows: LinkRow[] = event
    ? SUBTEST_TYPES.map((s) => ({
        code: s.code,
        label: s.label,
        url: event.links.find((l) => l.subtestType.code === s.code)?.url ?? null,
      }))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/"
        className="flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Kembali
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{school.name}</h1>
          {event && <p className="mt-1 text-sm text-zinc-500">{formatDateID(event.scheduledDate)}</p>}
        </div>
        {event && <StatusBadge status={event.status} size="lg" />}
      </div>

      {!event ? (
        <EmptyState
          icon={CalendarDays}
          title="Belum ada jadwal psikotes"
          description="Jadwal untuk sekolah ini akan muncul di sini setelah admin menambahkannya."
        />
      ) : (
        <>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
            <ProgressStepper status={event.status} />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-zinc-900">Link Subtes</h2>
              <CopyLinksButton
                text={buildLinkCopyText(
                  school.name,
                  rows.map((r) => ({ label: r.label, url: r.url ?? "" })),
                )}
              />
            </div>
            <LinkTable rows={rows} />
          </div>
        </>
      )}
    </div>
  );
}
