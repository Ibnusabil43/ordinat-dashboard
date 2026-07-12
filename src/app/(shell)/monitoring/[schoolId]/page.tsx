import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { getSchoolById } from "@/lib/queries/schools";
import { getSubmissionSummary, getLatestEventLinks } from "@/lib/queries/monitoring";
import { getKelasBySchoolId } from "@/lib/queries/kelas";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import {
  SubmissionSummary,
  SubmissionSummarySkeleton,
} from "@/components/admin/monitoring/SubmissionSummary";
import { NameCheck } from "@/components/admin/monitoring/NameCheck";
import { Tabs } from "@/components/Tabs";
import { LinkTable, type LinkRow } from "@/components/LinkTable";
import { TesterTable } from "@/components/TesterTable";
import { CopyLinksButton } from "@/components/CopyLinksButton";
import { resolveActiveSubtests } from "@/lib/constants";
import { buildLinkCopyText } from "@/lib/format";

/**
 * Per-school dashboard (FE-P1's second route). Two distinct empty/error
 * states (FE-P4): "driveRawSheetId not set" is a simple upfront check, vs.
 * "Sheets fetch failed" which only surfaces once getSubmissionSummary
 * actually tries and throws — different problems, different messages.
 *
 * "Link" + "Cek Nama" + "Kelas & Tester" tabs below the summary — TESTER
 * can't reach Event Detail or the Sekolah > Kelas page (both ADMIN/
 * PIC_LAPANGAN only), so Monitoring is this role's only way to see subtest
 * links AND kelas/tester assignments at all. "Kelas & Tester" is
 * deliberately read-only here (reuses the same TesterTable as Event
 * Detail's own Tester tab) — editing stays on Sekolah > Kelas, whose
 * server actions require requireStaff() and would just error for TESTER.
 * Independent of driveRawSheetId, same reasoning as Link.
 */
export default async function SchoolMonitoringPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const school = await getSchoolById(schoolId);
  if (!school) notFound();

  const [links, kelas] = await Promise.all([
    getLatestEventLinks(school.id),
    getKelasBySchoolId(school.id),
  ]);
  // This school's active subtests (defaults to all 13, school-level setting).
  const linkRows: LinkRow[] = resolveActiveSubtests(school.activeSubtests).map((s) => ({
    code: s.code,
    label: s.label,
    url: links.find((l) => l.subtestType.code === s.code)?.url ?? null,
  }));

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Link
        href="/monitoring"
        className="flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Kembali
      </Link>

      <PageHeader title={school.name} description="Ringkasan submisi psikotes." />

      {!school.driveRawSheetId ? (
        <EmptyState
          icon={AlertTriangle}
          title="Sheet RAW belum diatur"
          description={`Atur Drive Raw Sheet ID untuk ${school.name} di halaman Manajemen Sekolah agar data submisi bisa dipantau di sini.`}
        />
      ) : (
        // Streamed: the Sheets read is the slow part, so the page shell + tabs
        // below paint immediately and the summary fills in when it resolves.
        <Suspense fallback={<SubmissionSummarySkeleton />}>
          <SummarySection schoolId={school.id} />
        </Suspense>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
        <Tabs
          tabs={[
            {
              key: "link",
              label: "Link",
              content: (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-end">
                    <CopyLinksButton
                      text={buildLinkCopyText(
                        school.name,
                        linkRows.map((r) => ({ label: r.label, url: r.url ?? "" })),
                      )}
                    />
                  </div>
                  <LinkTable rows={linkRows} />
                </div>
              ),
            },
            {
              key: "cek-nama",
              label: "Cek Nama",
              content: school.driveRawSheetId ? (
                <NameCheck schoolId={school.id} />
              ) : (
                <EmptyState
                  icon={AlertTriangle}
                  title="Sheet RAW belum diatur"
                  description="Cek Nama butuh Drive Raw Sheet ID — atur di halaman Manajemen Sekolah."
                  className="py-6"
                />
              ),
            },
            {
              key: "kelas-tester",
              label: "Kelas & Tester",
              content: (
                <TesterTable
                  rows={kelas.map((k) => ({ id: k.id, kelas: k.name, tester: k.tester }))}
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

async function SummarySection({ schoolId }: { schoolId: string }) {
  let counts;
  try {
    counts = await getSubmissionSummary(schoolId);
  } catch {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Gagal memuat data"
        description="Sheet RAW tidak bisa diakses — cek apakah sudah dibagikan ke service account, atau coba lagi."
      />
    );
  }

  // counts is only null when driveRawSheetId isn't set — already checked by the caller, so this is unreachable in practice.
  if (!counts) return null;

  return <SubmissionSummary counts={counts} />;
}
