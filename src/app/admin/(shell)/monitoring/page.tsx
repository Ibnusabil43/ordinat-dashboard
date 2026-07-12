import Link from "next/link";
import { School } from "lucide-react";
import { getSchoolsForMonitoring } from "@/lib/queries/monitoring";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/EmptyState";

/**
 * School list/grid (FE-P1) — same card-grid treatment as School Management,
 * deliberately echoing the removed public home page's school grid (all 3
 * roles reach this, including TESTER, per PRD FR-11). Each card links to
 * the per-school dashboard at /admin/monitoring/[schoolId].
 */
export default async function MonitoringPage() {
  const schools = await getSchoolsForMonitoring();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader title="Monitoring" description="Pilih sekolah untuk lihat ringkasan submisi psikotes." />

      {schools.length === 0 ? (
        <EmptyState icon={School} title="Belum ada sekolah terdaftar" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schools.map((s) => (
            <Link
              key={s.id}
              href={`/admin/monitoring/${s.id}`}
              className="rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm sm:p-6"
            >
              <h2 className="font-semibold text-zinc-900">{s.name}</h2>
              {!s.driveRawSheetId && (
                <p className="mt-1 text-xs text-zinc-400">Sheet RAW belum diatur</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
