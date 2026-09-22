import type { DecodedPhrase, Flag, Severity } from "@/lib/types";

export type HoldRange =
  | { kind: "flag"; start: number; end: number; severity: Severity; flagId: string }
  | { kind: "decoder"; start: number; end: number; phrase: string };

export type HoldSegment = { text: string; range: HoldRange | null };

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function clamp(n: number, max: number) {
  return Math.max(0, Math.min(n, max));
}

/**
 * Build the non-overlapping highlight ranges for the Hold.
 *
 * Flags win: a flag range is never shortened or dropped for a decoder phrase,
 * and where two flags overlap the more severe one survives. Decoder phrases
 * are dropped whenever they touch a surviving flag or an earlier phrase.
 * Output is sorted by `start` and guaranteed disjoint.
 */
export function buildHoldRanges(
  flags: readonly Flag[],
  decoder: readonly DecodedPhrase[],
  textLength: number,
): HoldRange[] {
  const kept: HoldRange[] = [];

  const candidateFlags = flags
    .map((f) => ({
      kind: "flag" as const,
      start: clamp(f.start, textLength),
      end: clamp(f.end, textLength),
      severity: f.severity,
      flagId: f.id,
    }))
    .filter((r) => r.end > r.start)
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        a.start - b.start ||
        b.end - a.end,
    );

  for (const range of candidateFlags) {
    if (!kept.some((k) => overlaps(k, range))) kept.push(range);
  }

  const candidatePhrases: HoldRange[] = [];
  for (const entry of decoder) {
    for (const [rawStart, rawEnd] of entry.positions) {
      const start = clamp(rawStart, textLength);
      const end = clamp(rawEnd, textLength);
      if (end > start) {
        candidatePhrases.push({ kind: "decoder", start, end, phrase: entry.phrase });
      }
    }
  }
  candidatePhrases.sort((a, b) => a.start - b.start || b.end - a.end);

  for (const range of candidatePhrases) {
    if (!kept.some((k) => overlaps(k, range))) kept.push(range);
  }

  return kept.sort((a, b) => a.start - b.start);
}

function overlaps(a: { start: number; end: number }, b: { start: number; end: number }) {
  return a.start < b.end && b.start < a.end;
}

/** Slice `text` into rendered runs: plain text between ranges, marked text on them. */
export function segmentHold(text: string, ranges: readonly HoldRange[]): HoldSegment[] {
  const segments: HoldSegment[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) {
      segments.push({ text: text.slice(cursor, range.start), range: null });
    }
    segments.push({ text: text.slice(range.start, range.end), range });
    cursor = range.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), range: null });

  return segments;
}
