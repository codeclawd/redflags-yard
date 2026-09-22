// Bakes the committed first-frame result set.
//
// Runs the REAL engine (`lib/scan.ts`) over the REAL stored policies with
// `{ llm: false }` — the Groq pass is never reached, so this script cannot
// spend a token or invent a clause. Output is committed:
//
//   public/baked/<id>.json  — a complete ScanResult per ship
//   public/baked/matrix.json — the fleet ledger the matrix panel renders
//
// Run it by hand after the rulebook changes:  pnpm bake
//
// Node runs the TypeScript directly under --experimental-transform-types (the
// engine uses a parameter property, which strip-only mode rejects); the resolve
// hook below only teaches Node the `@/` alias that tsconfig gives the bundler.
// Always invoke it through `pnpm bake`, which passes that flag.

import { existsSync, statSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");

registerHooks({
  resolve(specifier, context, next) {
    if (!specifier.startsWith("@/")) return next(specifier, context);
    const base = path.join(root, specifier.slice(2));
    const file = [base, `${base}.ts`, `${base}.tsx`].find(
      (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
    );
    if (!file) throw new Error(`bake: cannot resolve ${specifier}`);
    return next(pathToFileURL(file).href, context);
  },
});

const { scan } = await import(pathToFileURL(path.join(root, "lib/scan.ts")).href);
const { SEVERITY_BY_CATEGORY } = await import(pathToFileURL(path.join(root, "lib/rules.ts")).href);

/** The columns the matrix shows: the habits that most often differ in kind. */
const COLUMNS = [
  "biometric_sensitive",
  "ai_training",
  "cross_site_tracking",
  "precise_location",
  "contacts_harvest",
  "human_review",
  "no_deletion",
  "business_transfer",
];

const policiesDir = path.join(root, "public", "policies");
const bakedDir = path.join(root, "public", "baked");

const index = JSON.parse(await readFile(path.join(policiesDir, "index.json"), "utf8"));

const onDisk = (await readdir(policiesDir)).filter((f) => f.endsWith(".json") && f !== "index.json");
if (onDisk.length !== index.length) {
  throw new Error(`bake: ${onDisk.length} policy files but ${index.length} index entries`);
}

await mkdir(bakedDir, { recursive: true });

const bakedAt = new Date().toISOString().slice(0, 10);
const ships = [];

for (const entry of index) {
  const policy = JSON.parse(await readFile(path.join(policiesDir, `${entry.id}.json`), "utf8"));
  const result = await scan(policy.text, { llm: false, policyId: entry.id });

  await writeFile(
    path.join(bakedDir, `${entry.id}.json`),
    `${JSON.stringify(result)}\n`,
    "utf8",
  );

  const counts = {};
  for (const category of COLUMNS) {
    counts[category] = result.flags.filter((flag) => flag.category === category).length;
  }

  ships.push({
    id: entry.id,
    name: entry.name,
    url: entry.url,
    fetchedAt: entry.fetchedAt,
    chars: entry.chars,
    score: result.score,
    flagCount: result.flags.length,
    counts,
  });

  console.log(
    `${entry.id.padEnd(9)} ${String(result.score.value).padStart(3)}/100 ${result.score.grade}  ` +
      `${String(result.flags.length).padStart(2)} flags  ` +
      `${COLUMNS.filter((c) => counts[c] > 0).length}/8 columns`,
  );
}

ships.sort((a, b) => b.score.value - a.score.value || a.name.localeCompare(b.name));

await writeFile(
  path.join(bakedDir, "matrix.json"),
  `${JSON.stringify(
    {
      bakedAt,
      engine: "rules + lexicon, no parley",
      columns: COLUMNS.map((id) => ({ id, severity: SEVERITY_BY_CATEGORY[id] })),
      ships,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`\nbaked ${ships.length} ships -> public/baked (${bakedAt})`);
