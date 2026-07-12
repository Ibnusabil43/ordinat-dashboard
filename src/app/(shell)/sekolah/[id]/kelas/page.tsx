import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSchoolById } from "@/lib/queries/schools";
import { getKelasBySchoolId } from "@/lib/queries/kelas";
import { PageHeader } from "@/components/admin/PageHeader";
import { KelasManager } from "@/components/admin/KelasManager";

/** ADMIN and PIC_LAPANGAN both reach this one (PRD FR-9) — no extra role guard beyond the shell's own. */
export default async function KelasManagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [school, kelas] = await Promise.all([getSchoolById(id), getKelasBySchoolId(id)]);
  if (!school) notFound();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Link
        href={`/sekolah/${school.id}`}
        className="flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Kembali
      </Link>
      <PageHeader title="Kelas & Tester" description={school.name} />
      <KelasManager schoolId={school.id} kelas={kelas} />
    </div>
  );
}
