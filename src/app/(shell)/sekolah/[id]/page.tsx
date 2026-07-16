import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSchoolById } from "@/lib/queries/schools";
import { PageHeader } from "@/components/admin/PageHeader";
import { SchoolForm } from "@/components/admin/SchoolForm";
import { updateSchool } from "@/server/actions/schools";
import { getCurrentRole } from "@/lib/auth-guard";

/** ADMIN-only page (Phase 19, BE-P1) — see sekolah/page.tsx. */
export default async function EditSchoolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if ((await getCurrentRole()) !== "ADMIN") redirect("/");

  const { id } = await params;
  const school = await getSchoolById(id);
  if (!school) notFound();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Link
        href="/sekolah"
        className="flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Kembali
      </Link>
      {/* "Kelola Kelas" removed here (Phase 19, FE-S2) — Kelas management now lives under its own Classes menu (/classes/[schoolId]). */}
      <PageHeader title="Edit Sekolah" description={school.name} />
      <SchoolForm
        action={updateSchool.bind(null, school.id)}
        initial={{
          name: school.name,
          slug: school.slug,
          driveRawSheetId: school.driveRawSheetId,
          driveFormFolderId: school.driveFormFolderId,
          activeSubtests: school.activeSubtests,
        }}
        submitLabel="Simpan Perubahan"
      />
    </div>
  );
}
