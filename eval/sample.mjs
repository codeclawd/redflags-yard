#!/usr/bin/env node
// Reproducible sampler for the frozen gold-label evaluation corpus.
//
// For each policy in public/policies/index.json, runs the CURRENT detector
// (`scan` from lib/scan.ts, `{ llm: false }` so it is deterministic and free)
// and splits its sentences (`splitSentences` from lib/text.ts). Then samples,
// with a seeded PRNG (mulberry32, seed 20260922):
//   - 15 sentences the detector FLAGS (uniform over the set of flagged
//     sentences, no duplicates)
//   - 15 sentences the detector does NOT flag, restricted to length >= 80
//     chars (uniform over that set)
// for 30 sentences per policy, 240 total across 8 policies.
//
// Output is the *sample only* — {policyId, start, end, text} — with no
// detector verdict attached. Hand-labeling (eval/gold.json) is written
// separately, deliberately without reading this script's stdout labels.
//
// lib/*.ts import each other via the "@/" tsconfig path alias and this repo
// has no tsx/ts-node devDependency, so this script self-relaunches with
// Node's native (experimental) TS transform once, then registers a tiny
// inline loader that resolves "@/x" -> "<repoRoot>/x[.ts]" before importing
// lib/scan.ts and lib/text.ts. Run with plain `node eval/sample.mjs`.

import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const TRANSFORM_FLAG = "--experimental-transform-types";

if (!process.execArgv.includes(TRANSFORM_FLAG) && !process.env.REDFLAGS_SAMPLE_RELAUNCHED) {
  const res = spawnSync(
    process.execPath,
    [TRANSFORM_FLAG, fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: "inherit", env: { ...process.env, REDFLAGS_SAMPLE_RELAUNCHED: "1" } },
  );
  process.exit(res.status ?? 1);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// --- inline loader: resolve the "@/" tsconfig path alias at runtime -------
const loaderSource = `
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
const root = ${JSON.stringify(repoRoot)};
function withExt(p) {
  for (const ext of ["", ".ts", ".tsx", ".mts"]) {
    if (fs.existsSync(p + ext) && fs.statSync(p + ext).isFile()) return p + ext;
  }
  return p;
}
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const full = withExt(path.join(root, specifier.slice(2)));
    return nextResolve(pathToFileURL(full).href, context);
  }
  return nextResolve(specifier, context);
}
`;
const { register } = await import("node:module");
register("data:text/javascript," + encodeURIComponent(loaderSource), pathToFileURL(repoRoot + "/"));

const { scan } = await import(pathToFileURL(path.join(repoRoot, "lib/scan.ts")).href);
const { splitSentences } = await import(pathToFileURL(path.join(repoRoot, "lib/text.ts")).href);

// --- seeded PRNG (mulberry32) + Fisher-Yates shuffle -----------------------
const SEED = 20260922;
function mulberry32(a) {
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const MIN_UNFLAGGED_CHARS = 80;
const PER_BUCKET = 15;

const rng = mulberry32(SEED);

const policiesDir = path.join(repoRoot, "public/policies");
const index = JSON.parse(fs.readFileSync(path.join(policiesDir, "index.json"), "utf8"));

const items = [];
const report = [];

for (const { id } of index) {
  const policy = JSON.parse(fs.readFileSync(path.join(policiesDir, `${id}.json`), "utf8"));
  const sentences = splitSentences(policy.text);
  const result = await scan(policy.text, { llm: false, policyId: id });

  // A sentence is "flagged" if any surviving flag overlaps its span. Rules
  // run per-sentence (runRules(sentences)) so in practice a flag's
  // [start,end) sits fully inside exactly one sentence's [start,end).
  const flaggedIdx = new Set();
  for (const flag of result.flags) {
    const si = sentences.findIndex((s) => flag.start >= s.start && flag.start < s.end);
    if (si >= 0) flaggedIdx.add(si);
  }

  const flaggedPool = sentences.filter((_, i) => flaggedIdx.has(i));
  const unflaggedPool = sentences.filter((s, i) => !flaggedIdx.has(i) && s.text.length >= MIN_UNFLAGGED_CHARS);

  const flaggedSample = shuffle(flaggedPool, rng).slice(0, PER_BUCKET);
  const unflaggedSample = shuffle(unflaggedPool, rng).slice(0, PER_BUCKET);

  report.push({
    policyId: id,
    sentences: sentences.length,
    flaggedPool: flaggedPool.length,
    unflaggedPool: unflaggedPool.length,
    flaggedSampled: flaggedSample.length,
    unflaggedSampled: unflaggedSample.length,
  });

  for (const s of [...flaggedSample, ...unflaggedSample]) {
    const text = policy.text.slice(s.start, s.end);
    if (text !== s.text) throw new Error(`offset mismatch in ${id} at ${s.start}-${s.end}`);
    items.push({ policyId: id, start: s.start, end: s.end, text });
  }
}

console.error("Sampling report (per policy):");
console.table(report);
console.error(`Total sampled: ${items.length}`);

fs.writeFileSync(path.join(repoRoot, "eval/sample.json"), JSON.stringify(items, null, 2) + "\n");
console.error("Wrote eval/sample.json");
