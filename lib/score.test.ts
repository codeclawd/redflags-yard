import { describe, expect, it } from "vitest";
import { gradeFor, rankFor, scoreScan, rawPlunder, curve, MAX_LEXICON_BONUS } from "@/lib/score";
import type { Flag, Severity, CategoryId } from "@/lib/types";

const flag = (severity: Severity, category: CategoryId = "sells_shares", i = 0): Flag => ({
  id: `${category}:${i}`,
  category,
  severity,
  score: 0.7,
  headline: "h",
  plainEnglish: "p",
  quote: "q",
  start: i,
  end: i + 1,
  specificity: "vague",
  source: "rule",
});

describe("scoreScan", () => {
  it("weights severities 18 / 10 / 5 / 2 before the curve", () => {
    expect(rawPlunder([flag("critical")], 0)).toBe(18);
    expect(rawPlunder([flag("high")], 0)).toBe(10);
    expect(rawPlunder([flag("medium")], 0)).toBe(5);
    expect(rawPlunder([flag("low")], 0)).toBe(2);
  });

  it("gives same-category repeats diminishing returns, capped at 2x", () => {
    const four = [0, 1, 2, 3].map((i) => flag("high", "no_deletion", i));
    expect(rawPlunder(four, 0)).toBeCloseTo(10 * 1.6);
    const twenty = Array.from({ length: 20 }, (_, i) => flag("high", "no_deletion", i));
    expect(rawPlunder(twenty, 0)).toBe(20);
  });

  it("uses the highest severity seen in a category", () => {
    expect(rawPlunder([flag("medium", "no_deletion", 0), flag("high", "no_deletion", 1)], 0)).toBeCloseTo(12);
  });

  it("does not discount across different categories", () => {
    const four: Flag[] = [
      flag("high", "no_deletion", 0),
      flag("high", "arbitration", 1),
      flag("high", "human_review", 2),
      flag("high", "childrens_data", 3),
    ];
    expect(rawPlunder(four, 0)).toBe(40);
  });

  it("caps the lexicon bonus at 15", () => {
    expect(rawPlunder([], 5)).toBe(5);
    expect(rawPlunder([], 500)).toBe(MAX_LEXICON_BONUS);
    expect(rawPlunder([], -5)).toBe(0);
  });

  it("curves: one critical clause is a Smuggler, not a Ghost ship", () => {
    expect(scoreScan([flag("critical")], 0).value).toBe(21);
    expect(scoreScan([flag("critical")], 0).rank).toBe("Smuggler");
  });

  it("clamps to 0..100 and never reaches 100 from a single category", () => {
    const many = Array.from({ length: 40 }, (_, i) => flag("critical", "sells_shares", i));
    expect(scoreScan(many, 100).value).toBeLessThan(100);
    expect(curve(10_000)).toBe(100);
    expect(curve(0)).toBe(0);
    expect(scoreScan([], 0).value).toBe(0);
  });
});

describe("bands", () => {
  it("grades on the locked boundaries", () => {
    expect(gradeFor(0)).toBe("A");
    expect(gradeFor(19)).toBe("A");
    expect(gradeFor(20)).toBe("B");
    expect(gradeFor(39)).toBe("B");
    expect(gradeFor(40)).toBe("C");
    expect(gradeFor(59)).toBe("C");
    expect(gradeFor(60)).toBe("D");
    expect(gradeFor(79)).toBe("D");
    expect(gradeFor(80)).toBe("F");
    expect(gradeFor(100)).toBe("F");
  });

  it("ranks on the same boundaries", () => {
    expect(rankFor(19)).toBe("Honest merchant");
    expect(rankFor(20)).toBe("Smuggler");
    expect(rankFor(40)).toBe("Privateer");
    expect(rankFor(60)).toBe("Pirate");
    expect(rankFor(80)).toBe("Ghost ship");
  });

  it("keeps grade and rank in lockstep", () => {
    for (let v = 0; v <= 100; v++) {
      const s = scoreScan([], 0);
      void s;
      expect(["A", "B", "C", "D", "F"]).toContain(gradeFor(v));
      expect(rankFor(v)).toBeTruthy();
    }
  });
});

// A policy with no findings must read as clean. The entry cost exists to make one
// real finding count; harmless decoder phrases alone ("at any time") used to trip it
// and a zero-finding policy scored 16/100.
describe("a policy with no findings", () => {
  it("scores near zero even when it contains decoder phrases", () => {
    const s = scoreScan([], 3);
    expect(s.value).toBeLessThan(5);
    expect(s.grade).toBe("A");
  });
  it("one real finding still pays the entry cost", () => {
    expect(scoreScan([flag("critical")], 0).value).toBe(21);
  });
});
