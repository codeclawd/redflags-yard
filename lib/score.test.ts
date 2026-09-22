import { describe, expect, it } from "vitest";
import { gradeFor, rankFor, scoreScan, MAX_LEXICON_BONUS } from "@/lib/score";
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
  it("weights severities 18 / 10 / 5 / 2", () => {
    expect(scoreScan([flag("critical")], 0).value).toBe(18);
    expect(scoreScan([flag("high")], 0).value).toBe(10);
    expect(scoreScan([flag("medium")], 0).value).toBe(5);
    expect(scoreScan([flag("low")], 0).value).toBe(2);
  });

  it("halves same-category flags beyond the third", () => {
    const four = [0, 1, 2, 3].map((i) => flag("high", "no_deletion", i));
    expect(scoreScan(four, 0).value).toBe(10 + 10 + 10 + 5);
  });

  it("does not discount across different categories", () => {
    const four: Flag[] = [
      flag("high", "no_deletion", 0),
      flag("high", "arbitration", 1),
      flag("high", "human_review", 2),
      flag("high", "childrens_data", 3),
    ];
    expect(scoreScan(four, 0).value).toBe(40);
  });

  it("caps the lexicon bonus at 15", () => {
    expect(scoreScan([], 5).value).toBe(5);
    expect(scoreScan([], 500).value).toBe(MAX_LEXICON_BONUS);
    expect(scoreScan([], -5).value).toBe(0);
  });

  it("clamps to 0..100", () => {
    const many = Array.from({ length: 40 }, (_, i) => flag("critical", "sells_shares", i));
    expect(scoreScan(many, 100).value).toBe(100);
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
