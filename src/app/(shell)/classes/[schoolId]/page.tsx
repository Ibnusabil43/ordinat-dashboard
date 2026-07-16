import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSchoolById } from "@/lib/queries/schools";
import { getKelasBySchoolId } from "@/lib/queries/kelas";
import { PageHeader } from "@/components/admin/PageHeader";
import { KelasManager } from "@/components/admin/KelasManager";

/**
 * Kelas manager (Phase 19, FE-S1) — relocated from /sekolah/[id]/kelas, same
 * component (KelasManager) and actions (kelas.ts), reused as-is. ADMIN and
 * PIC_LAPANGAN both reach this one (PRD FR-9) — no extra role guard beyond
 * the shell's own, same as the route it replaces.
 */
export default async function ClassesManagementPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const [school, kelas] = await Promise.all([
    getSchoolById(schoolId),
    getKelasBySchoolId(schoolId),
  ]);
  if (!school) notFound();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Link
        href="/classes"
        className="flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Back
      </Link>
      <PageHeader title="Classes" description={school.name} />
      <KelasManager schoolId={school.id} kelas={kelas} />
    </div>
  );
}
