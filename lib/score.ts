// The plunder score: 0..100, higher = worse for you.
//
// Every real policy trips dozens of flags, so a plain weighted sum pins the
// whole fleet at 100 and the rank stops meaning anything. Two corrections:
//  1. Diminishing returns per category — the first flag in a category counts
//     fully, each repeat adds REPEAT_FRACTION of the weight, capped at
//     REPEAT_CAP× the weight. Ten "affiliates" sentences are one habit.
//  2. A linear map with an entry cost: any flag at all costs ENTRY, then each
//     raw point adds SLOPE. One hidden biometric clause is already a Smuggler;
//     a clean policy is 0; the worst of the fleet approaches 100.

import type { Flag, ScanScore, Severity, Rank } from "@/lib/types";

const WEIGHT: Record<Severity, number> = { critical: 18, high: 10, medium: 5, low: 2 };
const REPEAT_FRACTION = 0.2;
const REPEAT_CAP = 2;
const ENTRY = 15;
/** Tuned against the eight-ship fleet (raw 151–218) so it spreads Pirate → Ghost ship. */
const SLOPE = 0.34;

export const MAX_LEXICON_BONUS = 15;

export function rawPlunder(flags: Flag[], lexiconHitsNotAlreadyFlagged: number): number {
  const perCategory = new Map<string, { weight: number; count: number }>();
  for (const f of flags) {
    const w = WEIGHT[f.severity];
    const cur = perCategory.get(f.category);
    if (!cur) perCategory.set(f.category, { weight: w, count: 1 });
    else {
      cur.weight = Math.max(cur.weight, w);
      cur.count += 1;
    }
  }
  let raw = 0;
  for (const { weight, count } of perCategory.values()) {
    raw += weight * Math.min(REPEAT_CAP, 1 + REPEAT_FRACTION * (count - 1));
  }
  raw += Math.min(MAX_LEXICON_BONUS, Math.max(0, lexiconHitsNotAlreadyFlagged));
  return raw;
}

/**
 * The entry cost is what makes a single real finding count. It is charged only when
 * there IS a finding: decoder phrases on their own ("at any time", "similar
 * technologies") are context, and used to lift a zero-finding policy to 16/100.
 */
export function curve(raw: number, hasFindings = true): number {
  if (raw <= 0) return 0;
  const entry = hasFindings ? ENTRY : 0;
  return Math.min(100, Math.max(0, Math.round(entry + SLOPE * raw)));
}

export function scoreScan(flags: Flag[], lexiconHitsNotAlreadyFlagged: number): ScanScore {
  const value = curve(rawPlunder(flags, lexiconHitsNotAlreadyFlagged), flags.length > 0);
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
