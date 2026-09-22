import { describe, expect, it } from "vitest";
import type { DecodedPhrase, Flag, Severity } from "@/lib/types";
import { buildHoldRanges, segmentHold } from "./hold-ranges";

const TEXT =
  "We share data with trusted partners. We may sell your personal information to advertisers. We keep it as long as necessary.";

function flag(id: string, start: number, end: number, severity: Severity): Flag {
  return {
    id,
    category: "sells_shares",
    severity,
    score: 0.8,
    headline: "h",
    plainEnglish: "p",
    quote: TEXT.slice(start, end),
    start,
    end,
    specificity: "specific",
    source: "rule",
  };
}

function phrase(p: string, positions: Array<[number, number]>): DecodedPhrase {
  return {
    phrase: p,
    meaning: "m",
    category: "vague_euphemism",
    severity: "medium",
    count: positions.length,
    positions,
  };
}

describe("buildHoldRanges", () => {
  it("returns disjoint ranges sorted by start", () => {
    const ranges = buildHoldRanges(
      [flag("a", 37, 90, "critical")],
      [phrase("trusted partners", [[18, 34]]), phrase("as long as necessary", [[102, 122]])],
      TEXT.length,
    );

    expect(ranges.map((r) => [r.kind, r.start, r.end])).toEqual([
      ["decoder", 18, 34],
      ["flag", 37, 90],
      ["decoder", 102, 122],
    ]);
  });

  it("drops a decoder phrase that overlaps a flag — flags win", () => {
    const ranges = buildHoldRanges(
      [flag("a", 37, 90, "high")],
      [phrase("sell", [[44, 48]])],
      TEXT.length,
    );

    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toMatchObject({ kind: "flag", start: 37, end: 90 });
  });

  it("keeps the more severe flag when two flags overlap", () => {
    const ranges = buildHoldRanges(
      [flag("low-one", 37, 90, "medium"), flag("bad-one", 40, 70, "critical")],
      [],
      TEXT.length,
    );

    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toMatchObject({ kind: "flag", flagId: "bad-one" });
  });

  it("drops a second decoder hit overlapping an earlier one", () => {
    const ranges = buildHoldRanges(
      [],
      [phrase("trusted partners", [[18, 34]]), phrase("partners", [[26, 34]])],
      TEXT.length,
    );

    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toMatchObject({ phrase: "trusted partners" });
  });

  it("clamps out-of-bounds offsets and drops empty ranges", () => {
    const ranges = buildHoldRanges(
      [flag("past-end", TEXT.length + 10, TEXT.length + 40, "critical"), flag("empty", 5, 5, "high")],
      [],
      TEXT.length,
    );

    expect(ranges).toEqual([]);
  });
});

describe("segmentHold", () => {
  it("reassembles the source text exactly", () => {
    const ranges = buildHoldRanges(
      [flag("a", 37, 90, "critical")],
      [phrase("trusted partners", [[18, 34]])],
      TEXT.length,
    );
    const segments = segmentHold(TEXT, ranges);

    expect(segments.map((s) => s.text).join("")).toBe(TEXT);
    expect(segments.filter((s) => s.range !== null)).toHaveLength(2);
  });

  it("marks the verbatim quote", () => {
    const segments = segmentHold(TEXT, buildHoldRanges([flag("a", 37, 90, "critical")], [], TEXT.length));
    const marked = segments.find((s) => s.range?.kind === "flag");

    expect(marked?.text).toBe("We may sell your personal information to advertisers.");
  });
});
