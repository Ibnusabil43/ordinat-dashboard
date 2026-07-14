/**
 * Lightweight name matcher for Monitoring's "Cek Nama" lookup (BE-O, v2 of
 * BE-M2). Still deliberately NOT Flask's `calc_match` — this is a human
 * reading a ranked list for a single manual lookup, not bulk auto-writing
 * scores, so a scoped scoring function is enough. Two techniques are
 * borrowed from `calc_match` (recap-fuzzy-score-matcher/app.py) because
 * they're small, self-contained, and directly fix real gaps found in v1:
 * the substring-floor idea and the ordered-word abbreviation match below.
 * `calc_match`'s acronym-detection branch is NOT ported — niche (a query of
 * pure initials), disproportionate complexity for a manual single-lookup
 * feature. See docs/STORIES_BACKEND.md's Epic BE-O for the full rationale.
 */

/** Uppercase, unify quote variants, collapse punctuation/whitespace — same normalization concept as Flask's normalize_name. Also used to compare kelas values (BE-O3), not just names. */
export function normalizeName(name: string): string {
  if (!name) return "";
  return name
    .trim()
    .toUpperCase()
    .replace(/[‘’'"]/g, "'")
    .replace(/[.\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(s: string): string[] {
  return s.split(" ").filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prevRow = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const currRow = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow.push(Math.min(prevRow[j] + 1, currRow[j - 1] + 1, prevRow[j - 1] + cost));
    }
    prevRow = currRow;
  }
  return prevRow[b.length];
}

/**
 * Typo tolerance, capped — NOT scaled linearly with length. A percentage-of-
 * length threshold (e.g. 20%) sounds reasonable but silently breaks for long
 * strings: two long, unrelated Indonesian names/phrases share enough common
 * letters that a generous absolute edit-distance budget matches them by
 * coincidence. Real typos are 1–3 characters regardless of name length, so
 * cap it there instead of letting it grow unbounded.
 */
function editDistanceThreshold(len: number): number {
  if (len <= 4) return 0;
  if (len <= 8) return 1;
  if (len <= 15) return 2;
  return 3;
}

/**
 * Every query word appears as a whole word somewhere in the candidate, any
 * order (BE-O5). Replaces a raw `candidate.includes(query)` substring check,
 * which has no word boundaries — "Ahmad" would match every "Ahmad ___" in a
 * sheet as a coincidence of characters, and a short letter run can land
 * inside an unrelated longer word. Whole-word containment keeps "type just a
 * first name" working while cutting down accidental fragment collisions.
 */
function tokenContainment(queryWords: string[], candidateWords: string[]): boolean {
  return queryWords.length > 0 && queryWords.every((qw) => candidateWords.includes(qw));
}

/**
 * Ported from `_ordered_word_match` in recap-fuzzy-score-matcher/app.py
 * (BE-O2) — word-by-word in order, a short (<=4 char) word counts as a match
 * against the corresponding long-side word if it's an exact prefix of it.
 * Covers the extremely common Indonesian pattern of "M."/"Moh"/"Muh"/"Moch"
 * all standing in for "Muhammad", and single initials generally ("P." ->
 * "Putra"). Returns the matched count (prefix hits count for 0.8, not 1).
 */
function orderedWordMatch(shortWords: string[], longWords: string[]): number {
  let matched = 0;
  let cursor = 0;
  for (const sw of shortWords) {
    for (let j = cursor; j < longWords.length; j++) {
      const lw = longWords[j];
      if (sw === lw) {
        matched += 1;
        cursor = j + 1;
        break;
      }
      if (sw.length <= 4 && lw.startsWith(sw)) {
        matched += 0.8;
        cursor = j + 1;
        break;
      }
    }
  }
  return matched;
}

/**
 * Continuous match score between 0 and 1 (BE-O1). A candidate counts as a
 * match at/above MATCH_THRESHOLD (see below). Combines: exact match, token-
 * aware containment (BE-O5), the ported ordered-word abbreviation match
 * (BE-O2), and edit-distance similarity — whichever signal scores highest
 * wins, they're not averaged.
 */
export function scoreNameMatch(query: string, candidate: string): number {
  const q = normalizeName(query);
  const c = normalizeName(candidate);
  if (!q || !c) return 0;
  if (q === c) return 1;

  // Real RAW sheets contain junk/incomplete rows — a name cell that's just
  // "a" or "-" isn't rare. Below 3 characters, only exact equality counts.
  const shorter = Math.min(q.length, c.length);
  if (shorter < 3) return 0;

  let score = 0;

  const qWords = words(q);
  const cWords = words(c);

  if (tokenContainment(qWords, cWords) || tokenContainment(cWords, qWords)) {
    score = Math.max(score, 0.82);
  }

  // Ordered-word abbreviation match — only meaningful once both sides have
  // at least 2 words (mirrors calc_match's own `len(wa)>=2 and len(wb)>=2`
  // gate; a single-token query is already handled by containment above).
  if (qWords.length >= 2 && cWords.length >= 2) {
    for (const [shortW, longW] of [
      [qWords, cWords],
      [cWords, qWords],
    ] as const) {
      const matched = orderedWordMatch(shortW, longW);
      const ratio = matched / shortW.length;
      if (ratio >= 0.6 && matched >= shortW.length - 0.5) {
        score = Math.max(score, ratio * 0.92);
      }
    }
  }

  const distance = levenshtein(q, c);
  if (distance <= editDistanceThreshold(shorter)) {
    const maxLen = Math.max(q.length, c.length);
    score = Math.max(score, 1 - distance / maxLen);
  }

  return score;
}

/** A candidate counts as a match only at/above this score (BE-O1). Tune after real-sheet testing per BE-O's pre-merge validation note. */
export const MATCH_THRESHOLD = 0.75;
