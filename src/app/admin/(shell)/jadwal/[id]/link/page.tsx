import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getEventById } from "@/lib/queries/events";
import { upsertSubtestLinks } from "@/server/actions/links";
import { PageHeader } from "@/components/admin/PageHeader";
import { LinkForm } from "@/components/admin/LinkForm";
import { formatDateID } from "@/lib/format";

export default async function LinkManagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const existing = Object.fromEntries(event.links.map((l) => [l.subtestType.code, l.url]));

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Link
        href={`/admin/jadwal/${event.id}`}
        className="flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Kembali
      </Link>

      <PageHeader
        title="Manajemen Link"
        description={`${event.school.name} — ${formatDateID(event.scheduledDate)}`}
      />

      <LinkForm
        action={upsertSubtestLinks.bind(null, event.id)}
        slug={event.school.slug}
        existing={existing}
      />
    </div>
  );
}
