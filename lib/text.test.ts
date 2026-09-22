import { describe, expect, it } from "vitest";
import { groundQuote, normalize, normalizeForMatch, splitSentences } from "@/lib/text";

describe("normalize", () => {
  it("is length-preserving, which is what makes offsets portable", () => {
    const samples = [
      "We may “share” your data with ‘partners’.",
      "a b​c—d…",
      "plain ascii text with no tricks",
    ];
    for (const s of samples) expect(normalize(s)).toHaveLength(s.length);
  });

  it("folds smart quotes and dashes to ascii", () => {
    expect(normalize("“trusted partners” — yes")).toBe('"trusted partners" - yes');
  });

  it("is idempotent", () => {
    const s = "We “may” share – from time to time.";
    expect(normalize(normalize(s))).toBe(normalize(s));
  });
});

describe("splitSentences", () => {
  const text =
    "We collect your personal information when you use the Services. " +
    "We may share it with our affiliates, e.g. companies we own, and with vendors. " +
    "Contact us at No. 5 Privacy Lane for more information about this policy.";

  it("preserves offsets exactly", () => {
    for (const s of splitSentences(text)) {
      expect(text.slice(s.start, s.end)).toBe(s.text);
    }
  });

  it("does not break on abbreviations", () => {
    const sentences = splitSentences(text);
    expect(sentences.some((s) => s.text.includes("e.g. companies we own"))).toBe(true);
    expect(sentences.some((s) => s.text.includes("No. 5 Privacy Lane"))).toBe(true);
  });

  it("does not break inside U.S. or decimals", () => {
    const s = "This applies to U.S. residents. Version 2.5 of the policy is current now.";
    const out = splitSentences(s);
    expect(out[0].text).toContain("U.S. residents");
    expect(out.some((x) => x.text.includes("2.5"))).toBe(true);
  });

  it("splits on real terminators", () => {
    expect(splitSentences(text).length).toBeGreaterThanOrEqual(3);
  });

  it("returns nothing for whitespace", () => {
    expect(splitSentences("   \n \n  ")).toEqual([]);
  });
});

describe("groundQuote", () => {
  const source = "We may  share your personal information with trusted partners for any purpose.";

  it("locates an exact quote at original offsets", () => {
    const at = groundQuote(source, "with trusted partners for any purpose");
    expect(at).not.toBeNull();
    expect(source.slice(at!.start, at!.end)).toBe("with trusted partners for any purpose");
  });

  it("tolerates collapsed whitespace and different case", () => {
    const at = groundQuote(source, "We may share your personal information");
    expect(at).not.toBeNull();
    expect(source.slice(at!.start, at!.end)).toBe("We may  share your personal information");
  });

  it("refuses a quote that is not in the source", () => {
    expect(groundQuote(source, "We sell your data to the highest bidder")).toBeNull();
  });

  it("refuses quotes too short to be meaningful", () => {
    expect(groundQuote(source, "we may")).toBeNull();
  });
});

describe("normalizeForMatch", () => {
  it("collapses to a comparable key", () => {
    expect(normalizeForMatch("  We “MAY” share! ")).toBe("we may share");
  });
});
