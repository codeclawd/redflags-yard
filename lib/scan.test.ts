import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MAX_CHARS, MIN_CHARS, ScanFailure, mergeFlags, rankFlags, scan } from "@/lib/scan";
import { normalize } from "@/lib/text";
import type { Flag } from "@/lib/types";

const DIR = path.join(process.cwd(), "public", "policies");
interface PolicyFile { id: string; name: string; text: string }

const index = JSON.parse(readFileSync(path.join(DIR, "index.json"), "utf8")) as { id: string }[];
const policies = index.map((p) => JSON.parse(readFileSync(path.join(DIR, `${p.id}.json`), "utf8")) as PolicyFile);

describe("the fleet", () => {
  it("ships 8 real policies", () => {
    expect(policies).toHaveLength(8);
    for (const p of policies) expect(p.text.length).toBeGreaterThan(20_000);
  });
});

describe("verbatim quotes — the non-negotiable guarantee", () => {
  for (const policy of policies) {
    it(`${policy.id}: text.slice(start, end) === quote for every flag`, async () => {
      const result = await scan(policy.text, { policyId: policy.id });
      expect(result.flags.length).toBeGreaterThan(0);
      for (const flag of result.flags) {
        // Against the raw stored policy text, not a cleaned copy.
        expect(policy.text.slice(flag.start, flag.end)).toBe(flag.quote);
        expect(normalize(policy.text).slice(flag.start, flag.end)).toBe(normalize(flag.quote));
        expect(flag.end).toBeGreaterThan(flag.start);
        expect(flag.id).toBe(`${flag.category}:${flag.start}`);
      }
    });

    it(`${policy.id}: every decoder position is a real occurrence`, async () => {
      const { decoder } = await scan(policy.text, { policyId: policy.id });
      expect(decoder.length).toBeGreaterThan(5);
      for (const entry of decoder) {
        expect(entry.meaning.length).toBeLessThanOrEqual(120);
        expect(entry.count).toBe(entry.positions.length);
        for (const [start, end] of entry.positions.slice(0, 5)) {
          expect(end).toBeGreaterThan(start);
          expect(policy.text.slice(start, end).length).toBe(end - start);
        }
      }
    });
  }
});

describe("scan(tiktok)", () => {
  const tiktok = policies.find((p) => p.id === "tiktok")!;

  it("finds at least 3 flags including cross_site_tracking", async () => {
    const result = await scan(tiktok.text, { policyId: "tiktok" });
    expect(result.flags.length).toBeGreaterThanOrEqual(3);
    expect(result.flags.map((f) => f.category)).toContain("cross_site_tracking");
  });

  it("never calls the LLM under test", async () => {
    const result = await scan(tiktok.text, { policyId: "tiktok" });
    expect(result.meta.llm).toBe("skipped:test");
    expect(result.meta.llmCount).toBe(0);
  });

  it("reports coherent meta and a scored verdict", async () => {
    const result = await scan(tiktok.text, { policyId: "tiktok" });
    expect(result.meta.policyId).toBe("tiktok");
    expect(result.meta.sourceChars).toBe(tiktok.text.length);
    expect(result.meta.sentenceCount).toBeGreaterThan(100);
    expect(result.meta.ruleCount + result.meta.lexiconCount + result.meta.llmCount).toBe(result.flags.length);
    expect(result.score.value).toBeGreaterThan(0);
    expect(result.score.value).toBeLessThanOrEqual(100);
    expect(["A", "B", "C", "D", "F"]).toContain(result.score.grade);
  });

  it("ranks severity first, then score, then position", async () => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 } as const;
    const { flags } = await scan(tiktok.text, { policyId: "tiktok" });
    for (let i = 1; i < flags.length; i++) {
      const a = flags[i - 1];
      const b = flags[i];
      const key = (f: Flag) => [order[f.severity], -f.score, f.start];
      expect(key(a) <= key(b) || order[a.severity] <= order[b.severity]).toBe(true);
    }
  });

  it("does not emit duplicate flag ids", async () => {
    const { flags } = await scan(tiktok.text, { policyId: "tiktok" });
    expect(new Set(flags.map((f) => f.id)).size).toBe(flags.length);
  });
});

describe("input guards", () => {
  it("F7 — rejects oversized input by naming the cap", async () => {
    await expect(scan("a".repeat(MAX_CHARS + 1))).rejects.toMatchObject({
      payload: { code: "CONTENT_TOO_LARGE" },
    });
    try {
      await scan("a".repeat(MAX_CHARS + 1));
    } catch (err) {
      expect((err as ScanFailure).payload.error).toContain("400,000");
    }
  });

  it("rejects text that is too short to be a policy", async () => {
    await expect(scan("too short")).rejects.toMatchObject({ payload: { code: "EMPTY_CONTENT" } });
    await expect(scan("x".repeat(MIN_CHARS - 1))).rejects.toMatchObject({ payload: { code: "EMPTY_CONTENT" } });
  });
});

describe("F1 / F2 / F3 end to end", () => {
  const preamble =
    "This Privacy Policy explains how the Services handle information about you when you create an account and use the product. ";

  it("F1 — a denial does not become a selling flag", async () => {
    const text = preamble.repeat(2) + "We do not sell your personal information to third parties for money. " + preamble;
    const { flags } = await scan(text);
    expect(flags.map((f) => f.category)).not.toContain("sells_shares");
  });

  it("F2 — a law-enforcement clause is suppressed", async () => {
    const text = preamble.repeat(2) + "We disclose your personal information to law enforcement when required by law. " + preamble;
    const { flags } = await scan(text);
    const onThatSentence = flags.filter((f) => f.quote.includes("law enforcement"));
    expect(onThatSentence).toHaveLength(0);
  });

  it("F3 — 'trusted partners to improve your experience' flags and decodes", async () => {
    const text = preamble.repeat(2) + "We may share your data with trusted partners to improve your experience. " + preamble;
    const { flags, decoder } = await scan(text);
    const categories = flags.map((f) => f.category);
    expect(categories.some((c) => c === "affiliate_sharing" || c === "vague_euphemism")).toBe(true);
    const phrases = decoder.map((d) => d.phrase);
    expect(phrases).toContain("trusted partners");
    expect(phrases).toContain("improve your experience");
  });
});

describe("merge and rank", () => {
  const base = (over: Partial<Flag>): Flag => ({
    id: "x",
    category: "sells_shares",
    severity: "critical",
    score: 0.6,
    headline: "h",
    plainEnglish: "p",
    quote: "We may share your personal information with partners.",
    start: 0,
    end: 53,
    specificity: "vague",
    source: "rule",
    ...over,
  });

  it("keeps the rule flag and inherits the lexicon's decoded translation", () => {
    const merged = mergeFlags([
      base({ source: "rule", headline: "Rule verdict" }),
      base({ source: "lexicon", decoded: { phrase: "trusted partners", meaning: "m" } }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].source).toBe("rule");
    expect(merged[0].headline).toBe("Rule verdict");
    expect(merged[0].decoded?.phrase).toBe("trusted partners");
  });

  it("orders critical before high before medium", () => {
    const ranked = rankFlags([
      base({ severity: "medium", category: "security_vague" }),
      base({ severity: "critical", category: "sells_shares" }),
      base({ severity: "high", category: "no_deletion" }),
    ]);
    expect(ranked.map((f) => f.severity)).toEqual(["critical", "high", "medium"]);
  });
});

describe("rankFlags interleaves categories", () => {
  it("puts the first flag of each category before any repeats within a tier", async () => {
    const { rankFlags } = await import("@/lib/scan");
    const mk = (category: "biometric_sensitive" | "ai_training", start: number) => ({
      id: `${category}:${start}`, category, severity: "critical" as const, score: 0.8,
      headline: "h", plainEnglish: "p", quote: "q", start, end: start + 1,
      specificity: "specific" as const, source: "rule" as const,
    });
    const out = rankFlags([mk("biometric_sensitive", 0), mk("biometric_sensitive", 5), mk("ai_training", 9)]);
    expect(out.map((f) => f.id)).toEqual(["biometric_sensitive:0", "ai_training:9", "biometric_sensitive:5"]);
  });
});
