import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getEventById } from "@/lib/queries/events";
import { getSchoolOptions } from "@/lib/queries/schools";
import { updateEvent } from "@/server/actions/events";
import { PageHeader } from "@/components/admin/PageHeader";
import { EventForm } from "@/components/admin/EventForm";
import { toDateInputValue } from "@/lib/format";

/**
 * Dedicated edit route — the "Ubah Jadwal" form used to live inline on the
 * event detail page, which meant saving refreshed the whole detail in place.
 * It's its own page now, reached from an "Ubah" action on the Manajemen
 * Jadwal list (and a button on the detail page); on save it navigates back
 * to the detail. ADMIN and PIC_LAPANGAN both reach it, same as detail — the
 * updateEvent action re-checks the session/role server-side regardless.
 */
export default async function EditEventPage({
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
        href={`/jadwal/${id}`}
        className="flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Kembali
      </Link>
      <PageHeader
        title="Ubah Jadwal"
        description={`${event.school.name} — status dikelola otomatis oleh sistem, tidak diubah di sini.`}
      />
      <EventForm
        action={updateEvent.bind(null, id)}
        schools={schools}
        initial={{
          schoolId: event.school.id,
          scheduledDate: toDateInputValue(event.scheduledDate),
        }}
        submitLabel="Simpan Perubahan"
        successRedirect={`/jadwal/${id}`}
        cancelHref={`/jadwal/${id}`}
      />
    </div>
  );
}
