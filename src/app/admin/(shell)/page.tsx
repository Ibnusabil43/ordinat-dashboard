import Link from "next/link";
import { School, CircleDot, RefreshCw, CheckCheck, AlertTriangle } from "lucide-react";
import { getOverviewStats, getEventsNeedingAttention } from "@/lib/queries/overview";
import { PageHeader } from "@/components/admin/PageHeader";
import { SummaryCard } from "@/components/admin/SummaryCard";
import { EmptyState } from "@/components/EmptyState";
import { formatDateID } from "@/lib/format";
import { REKAP_ATTENTION_THRESHOLD_DAYS } from "@/lib/constants";

function daysSince(date: Date): number {
  const ms = Date.now() - date.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export default async function OverviewPage() {
  const [stats, attention] = await Promise.all([getOverviewStats(), getEventsNeedingAttention()]);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader title="Overview" description="Ringkasan status psikotes saat ini." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <SummaryCard icon={School} value={stats.totalSchools} label="Total Sekolah" />
        <SummaryCard icon={CircleDot} value={stats.ongoingCount} label="Sedang Psikotes" />
        <SummaryCard icon={RefreshCw} value={stats.rekapCount} label="Tahap Rekap" />
        <SummaryCard icon={CheckCheck} value={stats.doneThisMonthCount} label="Selesai Bulan Ini" />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Butuh Perhatian</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Jadwal yang sudah lebih dari {REKAP_ATTENTION_THRESHOLD_DAYS} hari di tahap rekap.
        </p>

        <div className="mt-4">
          {attention.length === 0 ? (
            <EmptyState
              icon={CheckCheck}
              title="Tidak ada yang butuh perhatian"
              description="Semua rekap berjalan dalam batas waktu wajar."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {attention.map((e) => {
                const startedAt = e.recapJobs[0]?.startedAt;
                return (
                  <Link
                    key={e.id}
                    href={`/admin/jadwal/${e.id}`}
                    className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                  >
                    <div>
                      <h3 className="font-semibold text-zinc-900">{e.school.name}</h3>
                      {startedAt && (
                        <p className="mt-1 text-sm text-zinc-500">
                          Rekap mulai: {formatDateID(startedAt)} · sudah {daysSince(startedAt)} hari
                        </p>
                      )}
                    </div>
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white">
                      <AlertTriangle aria-hidden="true" size={12} />
                      Perlu ditindaklanjuti
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
