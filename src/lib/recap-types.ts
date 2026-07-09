/**
 * Shapes returned by the Automated Recap Flask API (proxied, never called
 * directly from the browser — see src/app/api/admin/recap/*). Kept in sync
 * with psikotes-automation/app.py by hand; there's no shared schema between
 * the two codebases.
 */

export interface PendingMatch {
  id: number;
  gugus: number;
  subtes: string;
  nama_rekap: string;
  nama_raw: string;
  score: number;
  source: "own" | "cross" | "proktor";
}

export interface GugusSummary {
  siswa: number;
  filled: number;
  total: number;
  pct: number;
  yellow: number;
}

export interface UnmatchedItem {
  gugus: number;
  nama: string;
  missing: string[];
  all_missing: boolean;
}

export interface YellowDetailGroup {
  gugus: number;
  names: string[];
}

export interface RecapLog {
  total_scores: number;
  cross_kelas: number;
  identity_filled: number;
  yellow_count: number;
  per_gugus: Record<string, GugusSummary>;
  unmatched_summary: UnmatchedItem[];
  yellow_detail: YellowDetailGroup[];
  subtes_detected: string[];
  rekap_subtes: string[];
}

export interface JobStatus {
  status: string; // 'queued' | free-text progress message | 'awaiting_review' | 'done' | 'error'
  progress: number;
  log: RecapLog | null;
  download_filename: string | null;
  error: string | null;
  pending?: PendingMatch[];
}
