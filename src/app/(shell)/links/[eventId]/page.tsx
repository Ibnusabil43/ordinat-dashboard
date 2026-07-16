import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getEventById } from "@/lib/queries/events";
import { upsertSubtestLinks } from "@/server/actions/links";
import { PageHeader } from "@/components/admin/PageHeader";
import { LinkForm } from "@/components/admin/LinkForm";
import { CheckLinksPanel } from "@/components/admin/CheckLinksPanel";
import { formatDateID } from "@/lib/format";
import { resolveActiveSubtests } from "@/lib/constants";
import { getCurrentRole } from "@/lib/auth-guard";

/**
 * Link management (Phase 19, FE-T1) — relocated from /jadwal/[id]/link, same
 * component (LinkForm/CheckLinksPanel) and action (upsertSubtestLinks),
 * reused as-is. ADMIN-only page (BE-H2/BE-P1) — PIC_LAPANGAN's Sidebar hides
 * the link, but a direct URL must still bounce.
 */
export default async function LinkManagementPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  if ((await getCurrentRole()) !== "ADMIN") redirect("/");

  const { eventId } = await params;
  const event = await getEventById(eventId);
  if (!event) notFound();

  const existing = Object.fromEntries(event.links.map((l) => [l.subtestType.code, l.url]));

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Link
        href="/links"
        className="flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Kembali
      </Link>

      <PageHeader
        title="Links"
        description={`${event.school.name} — ${formatDateID(event.scheduledDate)}`}
      />

      <CheckLinksPanel eventId={event.id} />

      <LinkForm
        action={upsertSubtestLinks.bind(null, event.id)}
        slug={event.school.slug}
        existing={existing}
        subtests={resolveActiveSubtests(event.school.activeSubtests)}
      />
    </div>
  );
}
