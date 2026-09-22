// FROZEN SCORING FILE — autoresearch. Do not edit to make a number look better.
//
// Measures the deterministic detector (llm:false) against eval/gold.json, a corpus
// labeled independently of detector output.
//
//   metric = (2 * falsePositives + falseNegatives) / items * 100      (lower is better)
//
// False positives count double: the product's stated bias is toward false negatives,
// and one junk flag discredits every real flag beside it.
//
// correct:false (a CRASH, not a loss) when either invariant breaks:
//   1. every gold offset still resolves against its policy text, and
//   2. every flag the detector emits is verbatim — text.slice(start,end) === quote.
// An "improvement" that fabricates a quote is not an improvement.

import { test } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { scan } from "@/lib/scan";
import type { CategoryId, Severity } from "@/lib/types";

type GoldItem = {
  policyId: string;
  start: number;
  end: number;
  text: string;
  label: { category: CategoryId; severity: Severity } | null;
  why?: string;
};
type Gold = { version: number; items: GoldItem[] };

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

/** Two ranges refer to the same sentence when they overlap at all. */
const overlaps = (a: [number, number], b: [number, number]) => a[0] < b[1] && b[0] < a[1];

test("score", async () => {
  const gold = JSON.parse(read("eval/gold.json")) as Gold;
  const policyIds = [...new Set(gold.items.map((i) => i.policyId))].sort();

  let offsetsOk = true;
  let quotesOk = true;
  let fp = 0;
  let fn = 0;
  let tp = 0;
  const fpExamples: string[] = [];
  const fnExamples: string[] = [];

  for (const policyId of policyIds) {
    const policy = JSON.parse(read(`public/policies/${policyId}.json`)) as { text: string };
    const result = await scan(policy.text, { llm: false });

    for (const f of result.flags) {
      if (policy.text.slice(f.start, f.end) !== f.quote) quotesOk = false;
    }

    for (const item of gold.items.filter((i) => i.policyId === policyId)) {
      if (policy.text.slice(item.start, item.end) !== item.text) offsetsOk = false;

      const hit = result.flags.find((f) => overlaps([f.start, f.end], [item.start, item.end]));
      if (item.label && hit) tp += 1;
      else if (item.label && !hit) {
        fn += 1;
        if (fnExamples.length < 12) fnExamples.push(`${policyId} ${item.label.category} :: ${item.text.slice(0, 120)}`);
      } else if (!item.label && hit) {
        fp += 1;
        if (fpExamples.length < 12) fpExamples.push(`${policyId} ${hit.category} :: ${item.text.slice(0, 120)}`);
      }
    }
  }

  const n = gold.items.length;
  const metric = ((2 * fp + fn) / n) * 100;
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  const correct = offsetsOk && quotesOk;

  writeFileSync(
    path.join(ROOT, "eval/last-errors.txt"),
    ["FALSE POSITIVES", ...fpExamples, "", "FALSE NEGATIVES", ...fnExamples].join("\n"),
  );

  const out = [
    `items:   ${n}`,
    `tp:      ${tp}`,
    `fp:      ${fp}`,
    `fn:      ${fn}`,
    `prec:    ${precision.toFixed(4)}`,
    `recall:  ${recall.toFixed(4)}`,
    `f1:      ${f1.toFixed(4)}`,
    `offsets: ${offsetsOk}`,
    `quotes:  ${quotesOk}`,
    `metric:  ${metric.toFixed(4)}`,
    `correct: ${correct}`,
  ].join("\n");
  writeFileSync(path.join(ROOT, "eval/metric.out"), out + "\n");
  console.log(out);
});
