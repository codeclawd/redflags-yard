import { describe, expect, it } from "vitest";
import { chunkSentences, groundFindings, llmResponseSchema, runLlm, CATEGORY_IDS } from "@/lib/llm";
import { splitSentences } from "@/lib/text";
import type { Flag } from "@/lib/types";

const SOURCE = [
  "We retain your personal information indefinitely, and copies may remain in our backups after you delete your account.",
  "We may share your personal information with our affiliates and with trusted partners for advertising purposes.",
  "We use commercially reasonable security measures to protect the information that we hold about you.",
].join(" ");

describe("the test guard", () => {
  it("returns skipped:test before anything can reach the network", async () => {
    const exploding = () => {
      throw new Error("the LLM must never be called from a test");
    };
    const out = await runLlm(SOURCE, splitSentences(SOURCE), [], {
      generate: exploding as never,
      timeoutMs: 6500,
      apiKey: "not a real key",
    });
    expect(out.status).toBe("skipped:test");
    expect(out.flags).toEqual([]);
  });

  it("is guarded by VITEST, which is set in this process", () => {
    expect(Boolean(process.env.VITEST) || process.env.NODE_ENV === "test").toBe(true);
  });
});

describe("groundFindings", () => {
  const grounded = {
    quote: "We retain your personal information indefinitely, and copies may remain in our backups after you delete your account.",
    category: "no_deletion" as const,
    headline: "They keep your data after you delete the account",
    plainEnglish: "Copies survive in backups.",
  };
  const fabricated = {
    quote: "We sell your personal information to the highest bidder every Tuesday.",
    category: "sells_shares" as const,
    headline: "They sell your data",
    plainEnglish: "Invented clause.",
  };

  it("F8 — keeps the grounded quote and silently drops the fabricated one", () => {
    const flags = groundFindings(SOURCE, [grounded, fabricated], []);
    expect(flags).toHaveLength(1);
    expect(flags[0].category).toBe("no_deletion");
    expect(flags[0].source).toBe("llm");
    expect(SOURCE.slice(flags[0].start, flags[0].end)).toBe(flags[0].quote);
  });

  it("re-slices the quote from the source rather than trusting the model's copy", () => {
    const sloppy = { ...grounded, quote: grounded.quote.replace(/ /g, "  ").toUpperCase() };
    const flags = groundFindings(SOURCE, [sloppy], []);
    expect(flags).toHaveLength(1);
    expect(flags[0].quote).toBe(grounded.quote);
  });

  it("drops findings that fail the schema", () => {
    expect(groundFindings(SOURCE, [{ quote: grounded.quote }, null, "nope", { ...grounded, category: "made_up" }], [])).toHaveLength(0);
  });

  it("drops a grounded quote that the firewall would suppress", () => {
    const source = "We do not sell your personal information to third parties under any circumstances at all.";
    const flags = groundFindings(source, [{
      quote: source,
      category: "sells_shares" as const,
      headline: "They sell your data",
      plainEnglish: "Wrong: this sentence denies it.",
    }], []);
    expect(flags).toHaveLength(0);
  });

  it("does not duplicate a finding the rules already made", () => {
    const existing: Flag[] = [{
      id: "no_deletion:0",
      category: "no_deletion",
      severity: "high",
      score: 0.8,
      headline: "x",
      plainEnglish: "y",
      quote: grounded.quote,
      start: 0,
      end: grounded.quote.length,
      specificity: "vague",
      source: "rule",
    }];
    expect(groundFindings(SOURCE, [grounded], existing)).toHaveLength(0);
  });

  it("rejects an over-long quote", () => {
    expect(groundFindings(SOURCE, [{ ...grounded, quote: "x".repeat(400) }], [])).toHaveLength(0);
  });
});

describe("plumbing", () => {
  it("chunks on sentence boundaries with overlap", () => {
    const long = Array.from({ length: 60 }, (_, i) =>
      `Clause number ${i} says that we may share your personal information with partners for business purposes.`).join(" ");
    const chunks = chunkSentences(splitSentences(long));
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.length).toBeLessThanOrEqual(6);
    for (const c of chunks) expect(c.length).toBeGreaterThan(0);
  });

  it("accepts a well-formed response and rejects extra keys", () => {
    expect(llmResponseSchema.safeParse({ findings: [] }).success).toBe(true);
    expect(llmResponseSchema.safeParse({ findings: [], extra: 1 }).success).toBe(false);
  });

  it("exposes all 18 categories to the model", () => {
    expect(CATEGORY_IDS).toHaveLength(18);
  });
});
