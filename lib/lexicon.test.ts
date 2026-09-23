import { describe, expect, it } from "vitest";
import { LEXICON, runLexicon } from "@/lib/lexicon";
import { SEVERITY_BY_CATEGORY } from "@/lib/rules";
import { splitSentences } from "@/lib/text";

const decode = (source: string) => runLexicon(source, splitSentences(source));

describe("the lexicon table", () => {
  it("has at least 50 entries — it is the headline feature", () => {
    expect(LEXICON.length).toBeGreaterThanOrEqual(50);
  });

  it("every entry matches its own display phrase", () => {
    for (const entry of LEXICON) {
      const re = new RegExp(entry.phrase.source, entry.phrase.flags.replace("g", ""));
      expect(re.test(entry.display), `${entry.display} does not match its own regex`).toBe(true);
    }
  });

  it("every regex is case-insensitive and global", () => {
    for (const entry of LEXICON) {
      expect(entry.phrase.flags, entry.display).toContain("i");
      expect(entry.phrase.flags, entry.display).toContain("g");
    }
  });

  it("every meaning is at most 120 characters", () => {
    for (const entry of LEXICON) {
      expect(entry.meaning.length, `${entry.display}: ${entry.meaning.length}`).toBeLessThanOrEqual(120);
    }
  });

  it("no meaning accuses the company of doing something", () => {
    // Principle: describe what the wording PERMITS, never what they do.
    const accusations = [/\bthey sell you\b/i, /\bthey are selling\b/i, /\bthey will sell\b/i, /\bscam\b/i, /\bsteal/i];
    for (const entry of LEXICON) {
      for (const bad of accusations) {
        expect(bad.test(entry.meaning), `${entry.display}: ${entry.meaning}`).toBe(false);
      }
    }
  });

  it("uses only real category ids with a plausible severity", () => {
    for (const entry of LEXICON) {
      expect(Object.keys(SEVERITY_BY_CATEGORY)).toContain(entry.category);
      expect(["critical", "high", "medium", "low"]).toContain(entry.severity);
    }
  });

  it("has no duplicate display phrases", () => {
    expect(new Set(LEXICON.map((e) => e.display)).size).toBe(LEXICON.length);
  });
});

describe("runLexicon", () => {
  it("decodes 'trusted partners'", () => {
    const { decoder } = decode(
      "We may share your personal information with trusted partners so that we can improve your experience across the Services.",
    );
    const hit = decoder.find((d) => d.phrase === "trusted partners");
    expect(hit).toBeDefined();
    expect(hit!.count).toBe(1);
    expect(hit!.meaning).toMatch(/never name|companies/i);
  });

  it("F3 — 'trusted partners to improve your experience' yields at least 2 decoder entries", () => {
    const { decoder, flags } = decode(
      "We may share your data with trusted partners to improve your experience on the Services.",
    );
    const phrases = decoder.map((d) => d.phrase);
    expect(phrases).toContain("trusted partners");
    expect(phrases).toContain("improve your experience");
    expect(decoder.length).toBeGreaterThanOrEqual(2);
    expect(flags.length).toBeGreaterThan(0);
  });

  it("records every occurrence with correct offsets", () => {
    const source =
      "We share data with affiliates. Later in this document we mention affiliates again for completeness of the record.";
    const hit = decode(source).decoder.find((d) => d.phrase === "affiliates");
    expect(hit!.count).toBe(2);
    for (const [start, end] of hit!.positions) {
      expect(source.slice(start, end).toLowerCase()).toBe("affiliates");
    }
  });

  it("does not raise a flag inside a firewalled sentence", () => {
    const { flags, decoder } = decode(
      "We do not share your personal information with trusted partners under any circumstances whatsoever.",
    );
    expect(decoder.some((d) => d.phrase === "trusted partners")).toBe(true);
    expect(flags).toHaveLength(0);
  });

  it("produces flags whose quote is a verbatim slice of the source", () => {
    const source =
      "We may share your precise location with advertising identifiers and analytics partners for interest-based advertising purposes.";
    for (const f of decode(source).flags) {
      expect(source.slice(f.start, f.end)).toBe(f.quote);
      expect(f.source).toBe("lexicon");
      expect(f.decoded).toBeDefined();
    }
  });

  it("ranks the decoder by severity then count", () => {
    const { decoder } = decode(
      "We share with trusted partners and affiliates. We may use cookies and similar technologies from time to time.",
    );
    const order = { critical: 0, high: 1, medium: 2, low: 3 } as const;
    for (let i = 1; i < decoder.length; i++) {
      expect(order[decoder[i - 1].severity]).toBeLessThanOrEqual(order[decoder[i].severity]);
    }
  });
});

// The vague_euphemism capability was removed from the rule table on purpose; it must
// still reach the reader through the decoder ring, or the change quietly lost a feature.
describe("vague_euphemism survives as decoder-only", () => {
  it("has lexicon entries and they still decode", () => {
    const entries = LEXICON.filter((e) => e.category === "vague_euphemism");
    expect(entries.length).toBeGreaterThanOrEqual(5);
    const { decoder } = runLexicon(
      "We may share your information for other business purposes, including but not limited to our legitimate interests.",
      splitSentences(
        "We may share your information for other business purposes, including but not limited to our legitimate interests.",
      ),
    );
    expect(decoder.some((d) => d.category === "vague_euphemism")).toBe(true);
  });
});

// The legal-process guard exists for compelled DISCLOSURE ("we share with police when
// required"). Keeping data "to defend legal claims" is still keeping it: once the guard
// learned plurals it began suppressing this Temu retention sentence, which the eval
// corpus labels as open-ended retention.
describe("a legal reason does not excuse retention", () => {
  const temu = "We generally retain personal information as long as necessary to fulfill the purposes for which we collected it, as well as for the purposes of satisfying any applicable U.S. legal, accounting, or reporting requirements, to establish, exercise or defend legal claims, or for fraud prevention purposes.";
  it("still flags retention justified by legal claims", () => {
    const { flags } = runLexicon(temu, splitSentences(temu));
    expect(flags.map((f) => f.category)).toContain("no_deletion");
  });
});

// Lexicon findings used a template headline ('"pixels" is doing a lot of work here') that
// appeared four times in a row and read as filler. They now carry their category's charge
// headline, so they join that charge's group; the phrase's own meaning stays in `decoded`.
describe("lexicon findings speak with their category's voice", () => {
  it("uses the category headline, not a template", async () => {
    const { RULES } = await import("@/lib/rules");
    const text = "We use cookies, pixels and SDKs placed by advertising partners to follow your activity on other websites and apps.";
    const { flags } = runLexicon(text, splitSentences(text));
    for (const f of flags) {
      expect(f.headline).not.toMatch(/doing a lot of work/);
      const rule = RULES.find((r) => r.category === f.category);
      if (rule) expect(f.headline).toBe(rule.headline);
      expect(f.decoded?.meaning).toBeTruthy();
    }
  });
});
