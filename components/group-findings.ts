import type { CategoryId, Flag, Severity } from "@/lib/types";

/** One charge: every sentence the engine flagged under the same headline. */
export interface ChargeGroup {
  headline: string;
  /** The worst severity among its sentences. */
  severity: Severity;
  category: CategoryId;
  plainEnglish: string;
  /** Every flagged sentence for this charge, in the order they appear in the policy. */
  flags: Flag[];
}

const RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/**
 * One row per distinct headline. A headline the engine found in nine sentences
 * is one charge with nine receipts, not nine charges. Groups run worst first,
 * then by how many sentences they were found in; ties keep the engine's order.
 */
export function groupFindings(flags: readonly Flag[]): ChargeGroup[] {
  const groups = new Map<string, ChargeGroup>();
  for (const flag of flags) {
    const group = groups.get(flag.headline);
    if (!group) {
      groups.set(flag.headline, {
        headline: flag.headline,
        severity: flag.severity,
        category: flag.category,
        plainEnglish: flag.plainEnglish,
        flags: [flag],
      });
      continue;
    }
    group.flags.push(flag);
    if (RANK[flag.severity] < RANK[group.severity]) group.severity = flag.severity;
  }

  const ordered = [...groups.values()];
  for (const group of ordered) group.flags.sort((a, b) => a.start - b.start);
  // Array.prototype.sort is stable, so equal groups keep first-seen order.
  return ordered.sort(
    (a, b) => RANK[a.severity] - RANK[b.severity] || b.flags.length - a.flags.length,
  );
}

/** "15 charges, found in 30 sentences" — the one count every part of the page uses. */
export function chargeCount(groups: readonly ChargeGroup[]) {
  const sentences = groups.reduce((sum, group) => sum + group.flags.length, 0);
  const charges = `${groups.length} charge${groups.length === 1 ? "" : "s"}`;
  return { charges, sentences: `${sentences} sentence${sentences === 1 ? "" : "s"}` };
}
