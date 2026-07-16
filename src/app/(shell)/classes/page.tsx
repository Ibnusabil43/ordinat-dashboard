import Link from "next/link";
import { ChevronRight, GraduationCap } from "lucide-react";
import { getSchoolsForClasses, type SchoolForClasses } from "@/lib/queries/schools";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";

/**
 * School list entry point for Classes (Phase 19, FE-S1) — same "pick a
 * school, drill in" shape as Monitoring's list. Each row links to
 * /classes/[schoolId], the relocated Kelas manager. ADMIN + PIC_LAPANGAN,
 * same as Schedules — no explicit page guard, middleware + the shell gate it.
 */
export default async function ClassesPage() {
  const schools = await getSchoolsForClasses();

  const columns: DataTableColumn<SchoolForClasses>[] = [
    {
      key: "name",
      header: "Sekolah",
      render: (s) => <span className="font-medium text-zinc-900">{s.name}</span>,
    },
    {
      key: "kelas",
      header: "Kelas",
      render: (s) => <span className="text-zinc-500">{s._count.kelas}</span>,
    },
    {
      key: "actions",
      header: "Aksi",
      className: "text-right",
      render: (s) => (
        <Link
          href={`/classes/${s.id}`}
          aria-label={`Kelola kelas ${s.name}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-900 transition hover:text-zinc-500"
        >
          Kelola
          <ChevronRight aria-hidden="true" size={16} />
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader title="Classes" description="Manage classes and assign testers." />

      <DataTable
        columns={columns}
        data={schools}
        getRowKey={(s) => s.id}
        emptyState={<EmptyState icon={GraduationCap} title="Belum ada sekolah terdaftar" />}
      />
    </div>
  );
}
