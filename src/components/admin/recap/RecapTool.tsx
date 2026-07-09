"use client";

import { useEffect, useRef, useState } from "react";
import { UploadForm } from "@/components/admin/recap/UploadForm";
import { ReviewTable } from "@/components/admin/recap/ReviewTable";
import { ResultsSummary } from "@/components/admin/recap/ResultsSummary";
import type { JobStatus } from "@/lib/recap-types";

const TERMINAL_STATUSES = ["done", "error", "awaiting_review"];

/**
 * Full-parity port of the original Flask tool's UI (templates/index.html.bak
 * in psikotes-automation), restyled monochrome. Talks only to our own
 * /api/admin/recap/* proxy routes — never to Flask directly.
 */
export function RecapTool() {
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [rekapFile, setRekapFile] = useState<File | null>(null);
  const [threshold, setThreshold] = useState("0.78");
  const [overrides, setOverrides] = useState("{}");
  const [tglPemeriksaan, setTglPemeriksaan] = useState("");
  const [pendidikan, setPendidikan] = useState("");

  const [jobId, setJobId] = useState<string | null>(null);
  const [st, setSt] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<number, boolean>>({});
  const [reviewBusy, setReviewBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reviewing = st?.status === "awaiting_review";
  const processing = !!st && !TERMINAL_STATUSES.includes(st.status) && !st.error;
  const done = st?.status === "done";

  useEffect(() => {
    if (!jobId) return;

    const check = async () => {
      try {
        const r = await fetch(`/api/admin/recap/status/${jobId}`);
        const d: JobStatus = await r.json();
        setSt(d);
        if (d.status === "awaiting_review" && d.pending) {
          setDecisions((prev) => {
            if (Object.keys(prev).length) return prev;
            const init: Record<number, boolean> = {};
            d.pending!.forEach((p) => (init[p.id] = true));
            return init;
          });
        }
        if (d.status === "done" || d.status === "error" || d.error) {
          if (pollRef.current) clearInterval(pollRef.current);
          if (d.error) setError(d.error);
        }
      } catch {
        // transient network hiccup — next tick retries, matches original behavior
      }
    };

    check();
    pollRef.current = setInterval(check, 600);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId]);

  const toggleDecision = (id: number) => setDecisions((d) => ({ ...d, [id]: !d[id] }));

  const submitReview = async () => {
    setReviewBusy(true);
    try {
      await fetch(`/api/admin/recap/review/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisions }),
      });
    } catch {
      setError("Gagal mengirim review.");
    }
    setReviewBusy(false);
  };

  const go = async () => {
    setError(null);
    setSt(null);
    setJobId(null);
    setDecisions({});
    if (!rawFile || !rekapFile) return;

    const fd = new FormData();
    fd.append("raw_file", rawFile);
    fd.append("rekap_file", rekapFile);
    fd.append("threshold", threshold);
    fd.append("manual_overrides", overrides);
    fd.append("tgl_pemeriksaan", tglPemeriksaan);
    fd.append("pendidikan", pendidikan);

    try {
      const r = await fetch("/api/admin/recap/process", { method: "POST", body: fd });
      const d = await r.json();
      if (d.error) {
        setError(d.error);
        return;
      }
      setJobId(d.job_id);
    } catch (e) {
      setError(`Gagal mengirim: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <UploadForm
        rawFile={rawFile}
        rekapFile={rekapFile}
        threshold={threshold}
        overrides={overrides}
        tglPemeriksaan={tglPemeriksaan}
        pendidikan={pendidikan}
        onRawFile={setRawFile}
        onRekapFile={setRekapFile}
        onThreshold={setThreshold}
        onOverrides={setOverrides}
        onTglPemeriksaan={setTglPemeriksaan}
        onPendidikan={setPendidikan}
        onSubmit={go}
        disabled={!rawFile || !rekapFile || processing || !!reviewing}
        processing={processing}
      />

      {processing && st && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
          <div className="mb-3 flex justify-between">
            <span className="font-mono text-sm text-zinc-900">{st.status}</span>
            <span className="font-mono text-sm text-zinc-500">{st.progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-zinc-900 transition-[width] duration-400"
              style={{ width: `${st.progress}%` }}
            />
          </div>
        </div>
      )}

      {reviewing && st?.pending && (
        <ReviewTable
          pending={st.pending}
          decisions={decisions}
          onToggle={toggleDecision}
          onSubmit={submitReview}
          busy={reviewBusy}
        />
      )}

      {error && (
        <div className="rounded-2xl border border-red-300 bg-white p-4 text-sm text-red-600 sm:p-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {done && st?.log && <ResultsSummary log={st.log} downloadFilename={st.download_filename} />}
    </div>
  );
}
