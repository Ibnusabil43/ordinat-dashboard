import { CheckCheck, IdCard, AlertTriangle, Shuffle, Download } from "lucide-react";
import { clsx } from "clsx";
import type { RecapLog } from "@/lib/recap-types";

/** Zinc intensity ramp for per-Gugus completion — darker = more complete. No hue, per DESIGN.md. */
function progressFillClass(pct: number): string {
  if (pct >= 100) return "bg-zinc-900";
  if (pct >= 90) return "bg-zinc-600";
  if (pct > 0) return "bg-zinc-400";
  return "bg-zinc-200";
}

function StatCard({ icon: Icon, value, label }: { icon: typeof CheckCheck; value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center">
      <Icon aria-hidden="true" size={18} className="mx-auto text-zinc-400" />
      <div className="mt-2 font-mono text-2xl font-bold text-zinc-900">{(value || 0).toLocaleString("id-ID")}</div>
      <div className="mt-1 text-xs tracking-wide text-zinc-500 uppercase">{label}</div>
    </div>
  );
}

export function ResultsSummary({
  log,
  downloadFilename,
}: {
  log: RecapLog;
  downloadFilename: string | null;
}) {
  const gugusEntries = Object.entries(log.per_gugus);

  return (
    <div className="flex flex-col gap-6">
      {downloadFilename && (
        <a
          href={`/api/admin/recap/download/${encodeURIComponent(downloadFilename)}`}
          className="flex h-10 w-fit items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700"
        >
          <Download aria-hidden="true" size={16} />
          Download Hasil
        </a>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={CheckCheck} value={log.total_scores} label="Scores" />
        <StatCard icon={IdCard} value={log.identity_filled} label="Identitas" />
        <StatCard icon={AlertTriangle} value={log.yellow_count} label="Kuning" />
        <StatCard icon={Shuffle} value={log.cross_kelas} label="Cross-Kelas" />
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Detail per Gugus</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs font-medium text-zinc-500">
                <th className="px-2 py-2">Gugus</th>
                <th className="px-2 py-2">Siswa</th>
                <th className="px-2 py-2">Progress</th>
                <th className="px-2 py-2">Kuning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {gugusEntries.map(([name, g]) => (
                <tr key={name}>
                  <td className="px-2 py-2 font-semibold text-zinc-900">{name}</td>
                  <td className="px-2 py-2 text-zinc-700">{g.siswa}</td>
                  <td className="px-2 py-2">
                    <div className="flex min-w-[140px] items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className={clsx("h-full rounded-full", progressFillClass(g.pct))}
                          style={{ width: `${g.pct}%` }}
                        />
                      </div>
                      <span className="w-9 text-right font-mono text-xs text-zinc-500">{g.pct}%</span>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={clsx(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                        g.yellow > 0 ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500",
                      )}
                    >
                      {g.yellow}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {log.yellow_detail.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Siswa Tidak Ada Data (Kuning)</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Kemungkinan tidak hadir saat tes atau data tidak tersedia di RAW.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {log.yellow_detail.map((g) => (
              <div key={g.gugus} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <div className="text-xs font-semibold text-zinc-900">
                  Gugus {g.gugus} — {g.names.length} siswa
                </div>
                {g.names.map((n, j) => (
                  <div key={j} className="mt-1 text-xs text-zinc-500">
                    {j + 1}. {n}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {log.unmatched_summary.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Subtes Tidak Lengkap</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Siswa hadir tapi beberapa subtes tidak ditemukan di RAW.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs font-medium text-zinc-500">
                  <th className="px-2 py-2">Gugus</th>
                  <th className="px-2 py-2">Nama</th>
                  <th className="px-2 py-2">Subtes Kosong</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {log.unmatched_summary.map((u, i) => (
                  <tr key={i}>
                    <td className="px-2 py-2 text-zinc-700">Gugus {u.gugus}</td>
                    <td className="px-2 py-2 font-medium text-zinc-900">{u.nama}</td>
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-900">
                        {u.missing.join(", ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
