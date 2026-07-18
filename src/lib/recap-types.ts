/**
 * Shapes returned by the Automated Recap Flask API (proxied, never called
 * directly from the browser — see src/app/api/admin/recap/*). Kept in sync
 * with psikotes-automation/app.py by hand; there's no shared schema between
 * the two codebases.
 */

/**
 * Anomaly-detection fields (Phase 20, BE-R1) — added in recap-fuzzy-score-matcher
 * commit 8ad7435 ("quality-gate thresholds and anomaly detection"). All four are
 * OPTIONAL on purpose: an older/rolled-back Flask deployment that doesn't send
 * them still typechecks and renders exactly as it did before this phase — this
 * is a pure response-shape addition, never a breaking change either direction.
 *
 * - `kind` discriminates what a pending item actually represents:
 *   "value" (one score cell), "answer_choice" (a whole EPPS/RIASEC/GB answer
 *   block), "leftover" (a RAW student not on any Gugus roster — informational
 *   only, there's no score to confirm; Flask's own /review handler already
 *   no-ops on this kind, see ReviewTable.tsx).
 * - `reason` is Flask's internal code (e.g. "C1_straightlining") — not meant
 *   to be rendered directly; `detail` is the human-readable version of it.
 * - `severity` distinguishes a hard block (needs real scrutiny) from a soft
 *   warn (heads up, lower stakes) — see ReviewTable.tsx's visual treatment.
 * - `detail` is Flask's own human-readable explanation (currently Indonesian
 *   — rendered as-is, not re-translated dashboard-side, since it's sourced
 *   from the other repo).
 */
export interface PendingMatch {
  id: number;
  gugus: number;
  subtes: string;
  nama_rekap: string;
  nama_raw: string;
  score: number;
  source: "own" | "cross" | "proktor";
  kind?: "value" | "answer_choice" | "leftover";
  reason?: string;
  severity?: "block" | "warn";
  detail?: string;
  /** For `kind: "leftover"` only — the closest-scoring roster name Flask found, even though it fell below the match threshold. Lets an admin manually confirm a match the matcher couldn't clear on its own (e.g. a vowel-dropped abbreviation). `null`/absent when no roster name scored above 0. */
  closest_candidate?: string | null;
  /** For `kind: "leftover"` only — true when `closest_candidate` scored high enough (and Flask resolved its exact roster row) to be offered as a per-subtest confirmable match in the review UI, rather than shown as a dead-end hint only. */
  confirmable?: boolean;
}

export interface GugusSummary {
  siswa: number;
  filled: number;
  total: number;
  pct: number;
  yellow: number;
  /** Per-answer-section (EPPS/RIASEC/GB) completion counts (Phase 20, BE-R2) — typed for forward-compatibility since Flask already sends it, but no UI consumes it yet (confirmed out of scope this pass, see STORIES_FRONTEND.md Epic FE-Y). */
  answer_coverage?: Record<string, number>;
}

/** One RAW student present in the sheet but absent from every Gugus roster (Phase 20, BE-R2) — informational, not an error. */
export interface LeftoverStudent {
  gugus: number;
  nama: string;
  kelas: string;
  best: number;
  subtes: string;
  /** Closest-scoring roster name Flask found, even though `best` fell below the match threshold — same field as `PendingMatch.closest_candidate`. */
  closest_candidate?: string | null;
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
  /** Students found in RAW but not on any Gugus roster (Phase 20, BE-R2) — optional, same forward-compat reasoning as PendingMatch's new fields. */
  leftover_raw?: LeftoverStudent[];
}

export interface JobStatus {
  status: string; // 'queued' | free-text progress message | 'awaiting_review' | 'done' | 'error'
  progress: number;
  log: RecapLog | null;
  download_filename: string | null;
  error: string | null;
  pending?: PendingMatch[];
}
