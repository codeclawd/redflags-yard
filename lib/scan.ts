// Orchestration: text -> rules + lexicon -> optional LLM -> merge -> rank -> score.

import type { DecodedPhrase, Flag, ScanError, ScanResult, Severity } from "@/lib/types";
import { normalize, normalizeForMatch, splitSentences } from "@/lib/text";
import { runRules } from "@/lib/rules";
import { runLexicon, lexiconHitsInRange } from "@/lib/lexicon";
import { runLlm, type GenerateFn } from "@/lib/llm";
import { scoreScan } from "@/lib/score";

export const MAX_CHARS = 400_000;
export const MIN_CHARS = 200;

export interface ScanOptions {
  llm?: boolean;
  llmTimeoutMs?: number;
  generate?: GenerateFn;
  policyId?: string;
}

export class ScanFailure extends Error {
  constructor(readonly payload: ScanError) {
    super(payload.error);
    this.name = "ScanFailure";
  }
}

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/**
 * Severity first; then, within a tier, the first flag of every category before
 * any category's repeats — a reader sees each distinct habit once at the top
 * instead of the same headline three times. Ties: score desc, position asc.
 */
export function rankFlags(flags: Flag[]): Flag[] {
  const byPosition = [...flags].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.score - a.score || a.start - b.start,
  );
  const seen = new Map<string, number>();
  const occurrence = new Map<string, number>();
  for (const f of byPosition) {
    const n = seen.get(f.category) ?? 0;
    occurrence.set(f.id, n);
    seen.set(f.category, n + 1);
  }
  return byPosition.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      occurrence.get(a.id)! - occurrence.get(b.id)! ||
      b.score - a.score ||
      a.start - b.start,
  );
}

const LEXICON_FLAG_MIN: Record<Flag["severity"], boolean> = { critical: true, high: true, medium: false, low: false };
const LEXICON_FLAGS_PER_CATEGORY = 2;

export function selectLexiconFlags(flags: Flag[]): Flag[] {
  const perCategory = new Map<string, number>();
  const out: Flag[] = [];
  for (const f of [...flags].sort((a, b) => a.start - b.start)) {
    if (!LEXICON_FLAG_MIN[f.severity]) continue;
    const n = perCategory.get(f.category) ?? 0;
    if (n >= LEXICON_FLAGS_PER_CATEGORY) continue;
    perCategory.set(f.category, n + 1);
    out.push(f);
  }
  return out;
}

const SOURCE_RANK = { rule: 0, llm: 1, lexicon: 2 } as const;

/**
 * Merge by (category, normalized quote). When a rule flag and a lexicon flag
 * collide the rule flag wins and inherits the lexicon's `decoded` translation —
 * the verdict comes from the rule, the decoder ring from the lexicon.
 */
export function mergeFlags(flags: Flag[]): Flag[] {
  const byKey = new Map<string, Flag>();
  for (const flag of flags) {
    const key = `${flag.category}:${normalizeForMatch(flag.quote)}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...flag });
      continue;
    }
    if (SOURCE_RANK[flag.source] < SOURCE_RANK[existing.source]) {
      byKey.set(key, { ...flag, decoded: flag.decoded ?? existing.decoded });
    } else {
      existing.decoded ??= flag.decoded;
      existing.score = Math.max(existing.score, flag.score);
    }
  }
  return [...byKey.values()];
}

export async function scan(rawText: string, opts: ScanOptions = {}): Promise<ScanResult> {
  const started = Date.now();

  if (rawText.length > MAX_CHARS) {
    throw new ScanFailure({
      error: `That policy is ${rawText.length.toLocaleString()} characters. The cap is ${MAX_CHARS.toLocaleString()}.`,
      code: "CONTENT_TOO_LARGE",
      retryable: false,
    });
  }
  if (rawText.trim().length < MIN_CHARS) {
    throw new ScanFailure({
      error: `There is not enough text to scan: at least ${MIN_CHARS} characters are needed.`,
      code: "EMPTY_CONTENT",
      retryable: false,
    });
  }

  // `normalize` is length-preserving, so offsets into `source` index `rawText`
  // identically and every quote below is sliced from the raw source.
  const source = normalize(rawText);
  const sentences = splitSentences(source);

  const ruleFlags = runRules(sentences);
  const { decoder, flags: lexiconFlags } = runLexicon(source, sentences);

  // The decoder ring carries every lexicon hit; the flag list carries only the
  // serious ones, at most two per category, so a policy that says "affiliates"
  // eleven times reads as one habit, not eleven findings. Bias to fewer flags.
  const lexiconSelected = selectLexiconFlags(lexiconFlags);
  let merged = mergeFlags([...ruleFlags, ...lexiconSelected]);

  // Attach a decoder translation to any rule flag whose sentence contains one.
  for (const flag of merged) {
    if (flag.decoded) continue;
    const hit = lexiconHitsInRange(source, flag.start, flag.end)[0];
    if (hit) flag.decoded = { phrase: hit.display, meaning: hit.meaning };
  }

  let llmFlags: Flag[] = [];
  let llmStatus: ScanResult["meta"]["llm"] = "skipped:no-key";
  if (opts.llm !== false) {
    const run = await runLlm(source, sentences, merged, {
      generate: opts.generate,
      timeoutMs: opts.llmTimeoutMs ?? 6500,
    });
    llmFlags = run.flags;
    llmStatus = run.status;
    if (llmFlags.length > 0) merged = mergeFlags([...merged, ...llmFlags]);
  }

  // Quotes must be verbatim slices of the source. Anything that is not is
  // dropped rather than displayed. Detection ran on the normalized text, so the
  // surviving quote is then re-sliced from the RAW input: the string a reader
  // sees is character-for-character what the company published, curly
  // apostrophes and all, and `rawText.slice(start, end) === quote` holds.
  const verified = merged
    .filter((f) => source.slice(f.start, f.end) === f.quote)
    .map((f) => ({ ...f, quote: rawText.slice(f.start, f.end) }));
  const ranked = rankFlags(verified);

  const lexiconHitsNotFlagged = countUnflaggedHits(decoder, ranked);

  return {
    flags: ranked,
    decoder,
    score: scoreScan(ranked, lexiconHitsNotFlagged),
    meta: {
      sourceChars: source.length,
      sentenceCount: sentences.length,
      ruleCount: ranked.filter((f) => f.source === "rule").length,
      lexiconCount: ranked.filter((f) => f.source === "lexicon").length,
      llmCount: ranked.filter((f) => f.source === "llm").length,
      llm: llmStatus,
      ms: Date.now() - started,
      ...(opts.policyId ? { policyId: opts.policyId } : {}),
    },
  };
}

/** Euphemisms that appear outside every flagged sentence — the residue the
 *  rules never saw, which is exactly what the decoder ring is for. */
function countUnflaggedHits(decoder: DecodedPhrase[], flags: Flag[]): number {
  let n = 0;
  for (const entry of decoder) {
    for (const [at] of entry.positions) {
      const inside = flags.some((f) => at >= f.start && at < f.end);
      if (!inside) n++;
    }
  }
  return n;
}
