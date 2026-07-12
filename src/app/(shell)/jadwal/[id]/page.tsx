import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Link2, Pencil } from "lucide-react";
import { getEventById } from "@/lib/queries/events";
import { getCurrentRole } from "@/lib/auth-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressStepper } from "@/components/ProgressStepper";
import { StartPsikotesButton } from "@/components/admin/StartPsikotesButton";
import { Tabs } from "@/components/Tabs";
import { LinkTable, type LinkRow } from "@/components/LinkTable";
import { CopyLinksButton } from "@/components/CopyLinksButton";
import { TesterTable } from "@/components/TesterTable";
import { resolveActiveSubtests } from "@/lib/constants";
import { formatDateID, buildLinkCopyText } from "@/lib/format";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, role] = await Promise.all([getEventById(id), getCurrentRole()]);
  if (!event) notFound();

  // This school's active subtests (defaults to all 13, school-level setting);
  // merged with the event's saved links in canonical order.
  const linkRows: LinkRow[] = resolveActiveSubtests(event.school.activeSubtests).map((s) => ({
    code: s.code,
    label: s.label,
    url: event.links.find((l) => l.subtestType.code === s.code)?.url ?? null,
  }));

  const testerRows = event.school.kelas.map((k) => ({ id: k.id, kelas: k.name, tester: k.tester }));

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
              href={`/jadwal/${event.id}/link`}
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
            >
              <Link2 aria-hidden="true" size={16} />
              Kelola Link ({event._count.links}/12)
            </Link>
          )}
        </div>
      </div>

      {/* Link Subtes / Tester — relocated here from the removed public school page (v2.0) */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
        <Tabs
          tabs={[
            {
              key: "links",
              label: "Link Subtes",
              content: (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-end">
                    <CopyLinksButton
                      text={buildLinkCopyText(
                        event.school.name,
                        linkRows.map((r) => ({ label: r.label, url: r.url ?? "" })),
                      )}
                    />
                  </div>
                  <LinkTable rows={linkRows} />
                </div>
              ),
            },
            {
              key: "tester",
              label: "Tester",
              content: <TesterTable rows={testerRows} />,
            },
          ]}
        />
      </div>
    </div>
  );
}
