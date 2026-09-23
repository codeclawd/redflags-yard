import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Flag, ScanResult, Severity } from "@/lib/types";
import { chargeCount, groupFindings } from "./group-findings";

const flag = (headline: string, severity: Severity, start: number): Flag => ({
  id: `${headline}:${start}`,
  category: "affiliate_sharing",
  severity,
  score: 0.5,
  headline,
  plainEnglish: `${headline} means`,
  quote: "q",
  start,
  end: start + 1,
  specificity: "specific",
  source: "rule",
});

const baked = (id: string) =>
  JSON.parse(
    readFileSync(path.join(import.meta.dirname, "..", "public", "baked", `${id}.json`), "utf8"),
  ) as ScanResult;

describe("groupFindings", () => {
  it("makes one group per distinct headline", () => {
    const groups = groupFindings([flag("a", "high", 5), flag("b", "high", 9), flag("a", "high", 1)]);
    expect(groups.map((g) => g.headline).sort()).toEqual(["a", "b"]);
    expect(groups.find((g) => g.headline === "a")!.flags.map((f) => f.start)).toEqual([1, 5]);
  });

  it("orders by severity first, then by how many sentences", () => {
    const groups = groupFindings([
      flag("medium-many", "medium", 1),
      flag("medium-many", "medium", 2),
      flag("medium-many", "medium", 3),
      flag("critical-one", "critical", 4),
      flag("high-one", "high", 5),
      flag("high-two", "high", 6),
      flag("high-two", "high", 7),
    ]);
    expect(groups.map((g) => g.headline)).toEqual([
      "critical-one",
      "high-two",
      "high-one",
      "medium-many",
    ]);
  });

  it("takes the worst severity of a group's sentences", () => {
    const [group] = groupFindings([flag("a", "medium", 1), flag("a", "critical", 2)]);
    expect(group.severity).toBe("critical");
  });

  it("returns nothing for no flags", () => {
    expect(groupFindings([])).toEqual([]);
    expect(chargeCount([])).toEqual({ charges: "0 charges", sentences: "0 sentences" });
  });

  it.each(["tiktok", "google", "discord", "zoom"])(
    "keeps every finding of the %s scan, each exactly once",
    (id) => {
      const result = baked(id);
      const groups = groupFindings(result.flags);
      const total = groups.reduce((sum, g) => sum + g.flags.length, 0);
      expect(total).toBe(result.flags.length);
      expect(groups.flatMap((g) => g.flags.map((f) => f.id)).sort()).toEqual(
        result.flags.map((f) => f.id).sort(),
      );
      expect(groups.length).toBe(new Set(result.flags.map((f) => f.headline)).size);
      for (const g of groups) expect(new Set(g.flags.map((f) => f.headline))).toEqual(new Set([g.headline]));
    },
  );

  // Derived, not pinned: a snapshot number ("30 sentences") broke every time the engine
  // legitimately dropped a false positive. The grouping invariant is what this guards.
  it("counts TikTok's cached scan as one charge per distinct headline, one sentence per finding", () => {
    const flags = baked("tiktok").flags;
    const distinct = new Set(flags.map((f) => f.headline)).size;
    expect(distinct).toBeLessThan(flags.length); // the grouping has something to collapse
    expect(chargeCount(groupFindings(flags))).toEqual({
      charges: `${distinct} charges`,
      sentences: `${flags.length} sentences`,
    });
  });
});
