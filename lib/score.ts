// The plunder score. Formula locked by the plan; do not tune it here.

import type { Flag, ScanScore, Severity, Rank } from "@/lib/types";

const WEIGHT: Record<Severity, number> = { critical: 18, high: 10, medium: 5, low: 2 };

/** Flags 4+ in the same category count half — one bad habit, not ten findings. */
const REPEAT_DISCOUNT_AFTER = 3;

export const MAX_LEXICON_BONUS = 15;

export function scoreScan(flags: Flag[], lexiconHitsNotAlreadyFlagged: number): ScanScore {
  const perCategory = new Map<string, number>();
  let raw = 0;
  for (const f of flags) {
    const n = (perCategory.get(f.category) ?? 0) + 1;
    perCategory.set(f.category, n);
    const w = WEIGHT[f.severity];
    raw += n > REPEAT_DISCOUNT_AFTER ? w / 2 : w;
  }
  raw += Math.min(MAX_LEXICON_BONUS, Math.max(0, lexiconHitsNotAlreadyFlagged));

  const value = Math.min(100, Math.max(0, Math.round(raw)));
  return { value, grade: gradeFor(value), rank: rankFor(value) };
}

export function gradeFor(value: number): ScanScore["grade"] {
  if (value < 20) return "A";
  if (value < 40) return "B";
  if (value < 60) return "C";
  if (value < 80) return "D";
  return "F";
}

export function rankFor(value: number): Rank {
  if (value < 20) return "Honest merchant";
  if (value < 40) return "Smuggler";
  if (value < 60) return "Privateer";
  if (value < 80) return "Pirate";
  return "Ghost ship";
}
