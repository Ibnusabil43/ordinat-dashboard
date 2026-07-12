/**
 * Lightweight name matcher for Monitoring's "Cek Nama" lookup (BE-M2).
 * Deliberately NOT Flask's `calc_match` — this is a human reading one
 * result for a single manual lookup, not bulk auto-writing scores, so
 * exact/substring/simple-edit-distance is enough. Reuses the *concept* of
 * `normalize_name` from the Flask tool's app.py, reimplemented in TS rather
 * than cross-calling Flask for it. See PRD §8 for why these stay separate.
 */

/** Uppercase, unify quote variants, collapse punctuation/whitespace — same normalization concept as Flask's normalize_name. */
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
 * True if `query` plausibly refers to `candidate`: normalized exact match,
 * a substring either direction (partial name typed in), or close enough by
 * edit distance to tolerate a typo. Not initials/acronym-aware — that
 * sophistication is `calc_match`'s job, not this one's.
 */
export function matchesName(query: string, candidate: string): boolean {
  const q = normalizeName(query);
  const c = normalizeName(candidate);
  if (!q || !c) return false;
  if (q === c) return true;

  // Real RAW sheets contain junk/incomplete rows — a name cell that's just
  // "a" or "-" isn't rare. Below 3 characters, only an exact match counts;
  // otherwise a 1-letter candidate trivially substring-matches almost any
  // longer query and every such row shows up as a false "found".
  const shorter = Math.min(q.length, c.length);
  if (shorter < 3) return false;

  if (c.includes(q) || q.includes(c)) return true;

  const threshold = editDistanceThreshold(shorter);
  return levenshtein(q, c) <= threshold;
}
