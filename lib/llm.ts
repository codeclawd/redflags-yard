// Optional LLM pass: "what did the rules miss?".
//
// Two hard rules live in this file.
//   1. It NEVER runs under test. The guard below returns before anything can
//      reach the network, so `pnpm vitest run` can never spend a Groq token.
//   2. Every quote it returns is grounded with `groundQuote` against the real
//      source. An un-groundable quote is dropped silently and counted nowhere,
//      which is what makes the hallucination guarantee mechanical rather than
//      a matter of trusting the model.

import { z } from "zod";
import type { Flag, ScanMeta, CategoryId } from "@/lib/types";
import { groundQuote, normalizeForMatch, type Sentence } from "@/lib/text";
import { isConditional, isNegated } from "@/lib/firewall";
import { classifySpecificity, SEVERITY_BY_CATEGORY } from "@/lib/rules";

export const CATEGORY_IDS = Object.keys(SEVERITY_BY_CATEGORY) as CategoryId[];

export const llmFindingSchema = z
  .object({
    quote: z.string(),
    category: z.enum(CATEGORY_IDS as [CategoryId, ...CategoryId[]]),
    headline: z.string(),
    plainEnglish: z.string(),
  })
  .strict();

export const llmResponseSchema = z.object({ findings: z.array(llmFindingSchema) }).strict();

export type LlmFinding = z.infer<typeof llmFindingSchema>;

export type GenerateFn = (args: {
  system: string;
  prompt: string;
  abortSignal: AbortSignal;
}) => Promise<{ findings: LlmFinding[] }>;

export interface RunLlmOptions {
  generate?: GenerateFn;
  timeoutMs: number;
  apiKey?: string;
  model?: string;
}

export interface RunLlmResult {
  flags: Flag[];
  status: ScanMeta["llm"];
}

const SYSTEM = [
  "You are a privacy-policy analyst. You find clauses that let a company do something harmful to the reader.",
  "Rules you must not break:",
  "1. Every `quote` must be copied CHARACTER-FOR-CHARACTER from the excerpt. Never paraphrase, never fix typos, never join sentences.",
  "2. A quote must be one complete sentence from the excerpt, at most 300 characters.",
  "3. Skip anything the policy DENIES (\"we do not sell\"), anything compelled by law enforcement or legal process, and anything gated on the reader's explicit consent.",
  "4. Describe what the wording PERMITS the company to do. Never assert what the company actually does.",
  "5. If the excerpt contains nothing clearly harmful, return an empty findings array. Finding nothing is a correct answer.",
  "6. `headline` is a short verdict in second person (\"They can keep your data after you delete your account\"). `plainEnglish` is one sentence on why it matters to the reader.",
].join("\n");

const CHUNK_CHARS = 2000;
const OVERLAP_SENTENCES = 2;
const MAX_CHUNKS = 6;
const MAX_QUOTE = 300;

export function chunkSentences(sentences: Sentence[]): Sentence[][] {
  const chunks: Sentence[][] = [];
  let current: Sentence[] = [];
  let size = 0;
  for (const s of sentences) {
    current.push(s);
    size += s.text.length;
    if (size >= CHUNK_CHARS) {
      chunks.push(current);
      current = current.slice(-OVERLAP_SENTENCES);
      size = current.reduce((n, x) => n + x.text.length, 0);
    }
  }
  if (current.length > OVERLAP_SENTENCES) chunks.push(current);
  return chunks.slice(0, MAX_CHUNKS);
}

function defaultGenerate(apiKey: string, model: string): GenerateFn {
  return async ({ system, prompt, abortSignal }) => {
    const [{ createGroq }, { generateText, Output }] = await Promise.all([
      import("@ai-sdk/groq"),
      import("ai"),
    ]);
    const groq = createGroq({ apiKey });
    const r = await generateText({
      model: groq(model),
      output: Output.object({ schema: llmResponseSchema }),
      providerOptions: { groq: { reasoningEffort: "low" } },
      system,
      prompt,
      abortSignal,
    });
    return r.output as { findings: LlmFinding[] };
  };
}

function classifyFailure(err: unknown): ScanMeta["llm"] {
  const msg = String((err as { message?: string })?.message ?? err ?? "").toLowerCase();
  if (msg.includes("abort") || msg.includes("timeout") || msg.includes("timed out")) return "skipped:timeout";
  if (msg.includes("429") || msg.includes("rate limit") || msg.includes("rate_limit") || msg.includes("quota")) {
    return "skipped:rate-limit";
  }
  return "skipped:error";
}

/**
 * Turn raw model findings into flags. Exported because it is the guarantee:
 * a quote that is not a real substring of `source` cannot survive this
 * function, and this is the only path by which an LLM finding becomes a flag.
 */
export function groundFindings(source: string, findings: unknown[], existing: Flag[]): Flag[] {
  const seen = new Set(existing.map((f) => `${f.category}:${normalizeForMatch(f.quote)}`));
  const flags: Flag[] = [];

  for (const finding of findings) {
    const parsed = llmFindingSchema.safeParse(finding);
    if (!parsed.success) continue;
    const { quote, category, headline, plainEnglish } = parsed.data;
    if (quote.length > MAX_QUOTE) continue;

    // The whole ballgame: an ungroundable quote is a fabrication, and dies here.
    const at = groundQuote(source, quote);
    if (!at) continue;

    const verbatim = source.slice(at.start, at.end);
    if (isNegated(verbatim) || isConditional(verbatim)) continue;

    const key = `${category}:${normalizeForMatch(verbatim)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    flags.push({
      id: `${category}:${at.start}`,
      category,
      severity: SEVERITY_BY_CATEGORY[category],
      score: 0.5,
      headline: headline.slice(0, 140),
      plainEnglish: plainEnglish.slice(0, 220),
      quote: verbatim,
      start: at.start,
      end: at.end,
      specificity: classifySpecificity(verbatim),
      source: "llm",
    });
  }
  return flags;
}

export async function runLlm(
  source: string,
  sentences: Sentence[],
  existing: Flag[],
  opts: RunLlmOptions,
): Promise<RunLlmResult> {
  // HARD GUARD — must stay the first statement in this function.
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return { flags: [], status: "skipped:test" };
  }

  const apiKey = opts.apiKey ?? process.env.GROQ_API_KEY;
  const generate = opts.generate ?? (apiKey ? defaultGenerate(apiKey, opts.model ?? "openai/gpt-oss-120b") : undefined);
  if (!generate) return { flags: [], status: "skipped:no-key" };

  const chunks = chunkSentences(sentences);
  if (chunks.length === 0) return { flags: [], status: "skipped:no-key" };

  const signal = AbortSignal.timeout(opts.timeoutMs);
  let failure: ScanMeta["llm"] | null = null;

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const excerpt = source.slice(chunk[0].start, chunk[chunk.length - 1].end);
      try {
        const out = await generate({
          system: SYSTEM,
          prompt: `Excerpt from a privacy policy. Find clauses the reader should know about.\n\n<excerpt>\n${excerpt}\n</excerpt>`,
          abortSignal: signal,
        });
        return out?.findings ?? [];
      } catch (err) {
        failure ??= classifyFailure(err);
        return [];
      }
    }),
  );

  const flags = groundFindings(source, results.flat(), existing);
  if (flags.length === 0 && failure) return { flags: [], status: failure };
  return { flags, status: "ran" };
}
