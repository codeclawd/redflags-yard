# Red Flags — Hackyard Yard #3 "One Screen" rebuild

Date: 2026-09-21 · Branch: main (fresh repo) · Status: EXECUTING · Scope: full product, one screen · Depends-on: nothing (greenfield)

## Context / why

I want to **rebuild Red Flags from scratch as a single-screen privacy-policy scanner** so that I can **submit a rules-compliant Hackyard Yard #3 entry that wins a community vote** by **shipping a fresh codebase with a much stronger euphemism-decoding engine and a retro-internet/pirate UI by Fri Sep 25 18:00 UTC.**

Hackyard rule (verbatim, hackyard.tech/yards/yard-3): *"Write it all during the build week, Monday 18:00 UTC to Friday 18:00 UTC. The idea can be old. The code cannot."* and *"the whole thing has to live in a single view. No routes, no navigation, no second page."* Submission = public repo + demo video + screenshot. Voting Fri–Sun.

The previous Red Flags (`/Users/ak/Projects/redflags`, last commit `57c3862`) is disqualified as-is: old code, routed `/faq` + `/privacy` pages, no GitHub remote. It is used here **only as domain evidence** (taxonomy, firewall idea, quote-grounding idea). No file is copied.

## Current state (VERIFIED)

- `/Users/ak/Projects/redflags-yard` scaffolded 2026-09-21 ~22:00 CDT via `create-next-app@latest` → commit `00871ee Initial commit from Create Next App`. `package.json` deps (verified by `node -e`): `next 16.3.5`, `react 19.2.8`, `ai ^7.0.108`, `@ai-sdk/groq ^4.0.46`, `zod ^4.6.5`, `motion ^13.4.0`, `lucide-react ^1.47.0`, `@mozilla/readability ^0.6.0`, `jsdom ^30.1.1`; dev: `vitest`, `@types/jsdom`.
- `ai` exports verified: `generateText Output generateObject jsonSchema streamText`. Groq provider options verified in `node_modules/@ai-sdk/groq/dist/index.d.ts:8-22`: `reasoningFormat`, `reasoningEffort`, `structuredOutputs`. Context7 (`/vercel/ai`, groq page): `generateText({ model: groq('…'), output: Output.object({ schema }) })` → `result.output`.
- `app/page.tsx` = create-next-app boilerplate; `app/layout.tsx` loads Geist via `next/font/google`; `app/globals.css` = Tailwind 4 `@import "tailwindcss"` + `@theme inline`. No other routes exist (`ls app` → `favicon.ico globals.css layout.tsx page.tsx`).
- `public/policies/{tiktok,temu,snap,spotify,discord,zoom,linkedin,google}.json` + `index.json` written from live fetches (Readability-extracted, 27–54k chars each; `.scratch/pack.mjs`). `.scratch/`, `.omc/`, `.impeccable/`, `.env*` are gitignored (`.gitignore:34` `.env*`).
- `.env.local` contains `GROQ_API_KEY` (copied from the old project; never printed, never committed).
- `next/font/google` exposes (verified by grep of `index.d.ts`): `Pirata_One`, `VT323`, `IBM_Plex_Mono`, `Space_Mono`, `Silkscreen`, `Press_Start_2P`, `Special_Elite`.
- lucide-react has (verified `ls icons`): `ship`, `ship-wheel`, `skull`, `anchor`, `flag`, `scroll-text`, `telescope`, `radar`, `swords`, `sword`, `waves`, `terminal`, `scan-eye`, `scan-face`, `fingerprint`, `eye-off`, `cookie`, `database`, `handshake`, `baby`, `hourglass`, `share-2`, `shield-*`, `siren`, `globe`, `coins`, `crown`.
- Negative evidence: no `vitest.config.*` yet; no `lib/` yet; no `api/` yet; no `DESIGN.md` yet.

## Decision + rationale

**Deterministic-first engine with an injectable LLM layer; one client component page; one route handler.** Alternative rejected: LLM-first (Groq free tier throttles; Vercel Hobby 10 s; a demo video cannot depend on a rate limit). The rule + lexicon passes are the product; Groq adds "what the rules missed" when available.

**Visual world**: "Jolly Rouge BBS" — a 1990s privateer's terminal that boards ships. Detailed in `DESIGN.md`. Brief-pinned (owner): retro-internet/hacker + pirate, fun, not corporate.

## Locked contract — `lib/types.ts` (verbatim; every lane imports from here, nobody edits it without updating this plan)

```ts
export type Severity = "critical" | "high" | "medium" | "low";
export type Source = "rule" | "lexicon" | "llm";
export type Specificity = "specific" | "vague";

export type CategoryId =
  | "sells_shares"          // critical — sells/shares personal data for value
  | "cross_site_tracking"   // critical — tracks across sites/apps/devices, fingerprinting, data brokers
  | "biometric_sensitive"   // critical — biometrics, health, sexual orientation, religion, genetic
  | "precise_location"      // critical — precise/GPS location, location history, background location
  | "ai_training"           // critical — uses your content/data to train models
  | "affiliate_sharing"     // critical — shares with "affiliates"/"corporate family"/"partners" undefined
  | "no_deletion"           // high — indefinite retention, can't delete, keeps after deletion
  | "perpetual_license"     // high — perpetual/irrevocable/worldwide licence to your content
  | "arbitration"           // high — forced arbitration, class-action/jury waiver
  | "childrens_data"        // high — collects from minors
  | "business_transfer"     // high — data is an asset in merger/sale/bankruptcy
  | "contacts_harvest"      // high — uploads address book / contacts / social graph
  | "human_review"          // high — humans read your messages/recordings/content
  | "silent_changes"        // medium — policy changes at any time / without notice
  | "implied_consent"       // medium — consent by continuing to use / by using
  | "dark_pattern_optout"   // medium — opt-out only, buried controls, "may not be able to opt out"
  | "security_vague"        // medium — "industry-standard"/"reasonable" security, no commitment
  | "vague_euphemism";      // medium/low — the decoder-ring catch-all

export interface Flag {
  id: string;               // stable: `${category}:${start}`
  category: CategoryId;
  severity: Severity;
  score: number;            // 0..1 within tier
  headline: string;         // verdict voice: "They can sell your data to advertisers"
  plainEnglish: string;     // one line, "what this means for you"
  quote: string;            // VERBATIM substring of source. Non-negotiable.
  start: number;            // char offset of quote in source text
  end: number;
  specificity: Specificity;
  source: Source;
  decoded?: { phrase: string; meaning: string }; // set when a lexicon hit produced/enriched the flag
}

export interface DecodedPhrase {
  phrase: string;           // canonical display form, e.g. "trusted partners"
  meaning: string;          // ≤120 chars, what it actually permits
  category: CategoryId;
  severity: Severity;
  count: number;
  positions: Array<[number, number]>; // offsets in source
}

export type Rank = "Honest merchant" | "Smuggler" | "Privateer" | "Pirate" | "Ghost ship";

export interface ScanScore {
  value: number;            // 0..100, higher = worse for you
  grade: "A" | "B" | "C" | "D" | "F";
  rank: Rank;
}

export interface ScanMeta {
  sourceChars: number;
  sentenceCount: number;
  ruleCount: number;
  lexiconCount: number;
  llmCount: number;
  llm: "ran" | "skipped:no-key" | "skipped:test" | "skipped:timeout" | "skipped:rate-limit" | "skipped:error";
  ms: number;
  policyId?: string;
}

export interface ScanResult {
  flags: Flag[];            // ranked: severity desc, then score desc, then start asc
  decoder: DecodedPhrase[]; // ranked by severity desc, count desc
  score: ScanScore;
  meta: ScanMeta;
}

export type ScanErrorCode =
  | "INVALID_INPUT" | "FETCH_FAILED" | "BLOCKED_URL" | "NOT_HTML"
  | "EMPTY_CONTENT" | "CONTENT_TOO_LARGE" | "RATE_LIMITED"
  | "SCAN_FAILED";        // added 2026-09-21 per review — 500 for unexpected exceptions

export interface ScanError { error: string; code: ScanErrorCode; retryable: boolean }
```

Scoring — **REVISED 2026-09-21 22:40 CDT** (original locked formula measured: all 8 ships = 100, rank constant; refuted by `lib/score.ts` measurement, see falsification log). Now: per category, `weight(maxSeverity) × min(2, 1 + 0.2×(count−1))` with weights critical 18 / high 10 / medium 5 / low 2, summed across categories, `+ min(15, unflaggedLexiconHits)` = `raw`; `value = raw === 0 ? 0 : clamp(round(15 + 0.34×raw), 0, 100)`. Grade A<20, B<40, C<60, D<80, F≥80; rank Honest merchant / Smuggler / Privateer / Pirate / Ghost ship on the same bands. Also: lexicon hits become *flags* only at severity ≥ high and at most 2 per category (`selectLexiconFlags` in `lib/scan.ts`); every hit still appears in the decoder ring. Measured after: TikTok 100 · Snap 95 · Spotify 87 · Temu 86 · Google 85 · LinkedIn 83 · Zoom 82 · Discord 78 (Pirate); flags 27–39 per ship (was 53–91).

## Units of work

### U1 — Engine (lane A) — `lib/`
Files: `lib/types.ts` (verbatim above) · `lib/text.ts` · `lib/rules.ts` · `lib/lexicon.ts` · `lib/firewall.ts` · `lib/score.ts` · `lib/scan.ts` · `lib/llm.ts` · `lib/fetch-policy.ts` · tests `lib/*.test.ts` · `vitest.config.mts`.

- `text.ts`: `normalize(s)` (NFKC, collapse whitespace, smart quotes → ascii), `splitSentences(text): {text,start,end}[]` with offsets preserved and abbreviation guards (`e.g.`, `i.e.`, `U.S.`, `Inc.`, `Ltd.`, `No.`, numbered list markers), `groundQuote(source, quote): {start,end} | null` = normalized-substring locate returning ORIGINAL offsets.
- `firewall.ts`: `isConditional(sentence): boolean` — suppress sentences matching law-enforcement/legal-process, consent/opt-in/"if you choose", and negation ("we do not sell", "never share", "no longer") guards. Over-suppress. Export the guard lists for tests.
- `rules.ts`: data table `RULES: Rule[]` with `{ id, category, severity, patterns: RegExp[], negativeGuards?: RegExp[], headline, plainEnglish, firewall: boolean }`, ≥ 2 patterns per category, all 18 categories. `runRules(sentences) → Flag[]` (one flag per (category, sentence), `source:"rule"`, `score` = 0.6 + 0.1×patternsMatched capped 1).
- `lexicon.ts`: `LEXICON: LexiconEntry[]` ≥ 50 entries `{ phrase: RegExp, display, meaning, category, severity }`. **This is the headline feature — words that sound normal but hide harm.** Required entries (at minimum): trusted partners · select/valued partners · affiliates / corporate family / companies we own · service providers / vendors (unnamed) · improve our services / improve your experience · personalize / tailor (your experience|ads|content) · legitimate interests · business purposes · de-identified / aggregated / anonymized (re-identification risk) · pseudonymous identifiers · inferred / derived data · publicly available information · including but not limited to · from time to time · may (share|collect|use) · as long as necessary · as permitted by law / where permitted · business transfer / successor / merger / acquisition / bankruptcy · industry-standard / reasonable security · by using the service you agree / continued use constitutes · opt out (vs opt-in) · you may not be able to opt out · precise location · advertising identifiers / mobile ad ID · analytics partners / measurement partners · social plugins / pixels / SDKs · cross-context behavioral advertising · data enrichment / third-party sources · verify your identity (biometric) · voice recordings / human reviewers · train (our|AI|machine learning) models · retain … even after (deletion|you close) · sell (or "share" in the CCPA sense) · targeted / interest-based advertising · profiling / automated decision · contacts / address book / friends list · cookies and similar technologies · device fingerprint / probabilistic matching · precise geolocation · background location. `runLexicon(source) → { decoder: DecodedPhrase[], flags: Flag[] }` — each hit becomes a decoder entry; hits with severity ≥ medium ALSO become `source:"lexicon"` flags on the containing sentence unless the firewall suppresses that sentence; dedupe against rule flags by (category, sentence) keeping the rule flag and attaching `decoded`.
- `score.ts`: locked formula above → `ScanScore`.
- `llm.ts`: `runLlm(source, sentences, existing: Flag[], opts: { generate?: GenerateFn; timeoutMs: number }) → Promise<{ flags: Flag[]; status: ScanMeta["llm"] }>`. Default `generate` uses `createGroq({ apiKey })` + `generateText({ model: groq('openai/gpt-oss-120b'), output: Output.object({ schema }), providerOptions: { groq: { reasoningEffort: 'low' } } })`; verify pass with `openai/gpt-oss-20b` (`SUPPORTED | OVERSTATED | NOT_SUPPORTED`). Chunk on sentence boundaries ~2000 chars, 2-sentence overlap, run chunks with `Promise.all` under a single `AbortSignal.timeout(timeoutMs)`. Every returned quote goes through `groundQuote`; un-groundable → dropped. **Hard guard:** `if (process.env.VITEST || process.env.NODE_ENV === "test") return { flags: [], status: "skipped:test" }` BEFORE any network; no key → `skipped:no-key`.
- `scan.ts`: `scan(text, opts?) → ScanResult` orchestrating text → rules + lexicon → llm (if enabled) → merge/dedupe (normalized quote + category) → rank → score → meta. Input caps: 400 000 chars → `CONTENT_TOO_LARGE`; < 200 chars → `EMPTY_CONTENT`.
- `fetch-policy.ts`: `fetchPolicyText(url)` — http(s) only; resolve DNS via `node:dns/promises` and reject private/loopback/link-local/metadata ranges (SSRF); 8 s timeout; 2 MB cap; Readability via jsdom; `NOT_HTML` when content-type isn't html/text.
- Tests (vitest, node env): `text.test.ts` (offsets survive round-trip; abbreviations), `firewall.test.ts` (law-enforcement + negation suppress; positive sentence passes), `rules.test.ts` (each category has ≥1 positive and ≥1 firewall-suppressed fixture), `lexicon.test.ts` (≥50 entries; every entry matches its own display phrase; "trusted partners" decodes), `scan.test.ts` (real `public/policies/tiktok.json` yields ≥3 flags incl. `cross_site_tracking`; every flag's `source.slice(start,end) === quote`; `meta.llm === "skipped:test"`), `llm.test.ts` (with a fake `generate` returning one grounded + one fabricated quote → only the grounded one survives; test env never calls network — assert `status`), `score.test.ts` (bands).

Acceptance: `pnpm vitest run` → 0 failed; `grep -rn "process.env.VITEST" lib/llm.ts` → 1 hit; `grep -c "phrase:" lib/lexicon.ts` ≥ 50.

### U2 — API — `app/api/scan/route.ts` (lane A, after scan.ts)
`POST { policyId? | text? | url? }` → `ScanResult | ScanError`. `policyId` reads `public/policies/<id>.json` from disk via `node:fs` (allowlist from `index.json`). `export const maxDuration = 10`. In-memory token-bucket rate limit per IP (20/min). LLM `timeoutMs: 6500`. Response header `Cache-Control: no-store`. Zod-validate body.
Acceptance: `curl -s -X POST localhost:3000/api/scan -H 'content-type: application/json' -d '{"policyId":"tiktok"}' | jq '.flags | length'` ≥ 3.

### U3 — UI (lane B) — `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `components/*`
One screen per `DESIGN.md`. Zones: **Status bar** (marquee ticker, visitor counter = scans this session, clock UTC) · **Harbor** (fleet of 8 ship cards from `/policies/index.json`; paste textarea; URL input; "Board" button) · **Deck** (terminal log that types during scan; then Plunder readout + rank; flags list — each flag: category glyph, headline, plain-English, parchment quote card with the exact sentence; click → highlights the sentence in the **Hold** panel) · **Hold** (the full policy text with flagged sentences highlighted and decoder phrases underlined; expand/collapse) · **Decoder ring** (phrase → meaning, count; hover/click underlines occurrences in the Hold). No `<Link>`, no second route, no `router.push`. Modals/overlays allowed (an "About / how it works" overlay and a "Share" overlay).
States: empty (fleet + hint), scanning (log typing, controls disabled), results, error (named problem + recovery), LLM-skipped notice ("Parley skipped — rules only" with reason). Mobile stacks vertically and scrolls. Keyboard: fleet cards are buttons; flags are `<details>`-like disclosure buttons; focus rings themed.
Acceptance: `grep -rn "next/link\|useRouter\|router.push" app components` → 0 hits; `ls app` shows exactly `api favicon.ico globals.css layout.tsx page.tsx`; `node ~/.claude/skills/impeccable/scripts/detect.mjs --json app components` → 0 errors; Playwright/agent-browser screenshot at 1440×900 and 390×844 reviewed by me.

### U4 — Ship
`README.md` (what/why/how, the verbatim-quote guarantee, decoder ring, Hackyard note "all code written Sep 21–25 2026") · LICENSE MIT · `gh repo create codeclawd/redflags-yard --public` · `vercel` project + `GROQ_API_KEY` env via `vercel env add` · `vercel --prod`. Screenshot + video are the owner's (I'll produce the screenshot; video needs the owner or a recorded Playwright run).

## Sequencing

```
U1 engine (lane A) ──┬─► U2 API ──┐
                     │            ├─► integrate → QA → reviews → U4 ship
U3 UI   (lane B) ────┴────────────┘   (U3 builds against lib/types.ts + a mock ScanResult until U2 lands)
```
U1 ∥ U3 in parallel worktrees? No — same repo, disjoint files (`lib/**`, `app/api/**` vs `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `components/**`, `DESIGN.md`). Both agents commit only their own file lists.

## Verification (contract)

1. `pnpm tsc --noEmit` → 0 errors
2. `pnpm vitest run` → 0 failed, ≥ 7 test files
3. `pnpm lint` → 0 errors
4. `pnpm build` → success; route table shows `/` and `/api/scan` only
5. `grep -rn "next/link\|useRouter" app components` → 0
6. `grep -rn "GROQ_API_KEY" lib app | grep -v "process.env.GROQ_API_KEY"` → 0 (key never inlined)
7. Live: `curl -s -X POST https://<prod>/api/scan -d '{"policyId":"tiktok"}' -H 'content-type: application/json' | jq '.score, (.flags|length), .meta.llm'` → score object, ≥3, `"ran"` or a `skipped:*` reason (rate limit acceptable)
8. Every flag verbatim: test asserts `text.slice(start,end) === quote` for all 8 policies.
9. Impeccable detector 0 errors; screenshots at desktop + mobile inspected.
10. Independent review lanes: `/code-review` + security review (SSRF, rate limit, key handling) — separate agents, sonnet.

## Edge cases (F-table)

| # | Scenario | Expected | Never |
|---|---|---|---|
| F1 | "We do not sell your personal information" | no `sells_shares` flag; may appear in decoder as informational only if lexicon marks it low | flag it as selling |
| F2 | "We disclose data to law enforcement when required by law" | suppressed by firewall | critical flag |
| F3 | "We may share with trusted partners to improve your experience" | `affiliate_sharing`/`vague_euphemism` flag + 2 decoder entries | invent who the partners are |
| F4 | Groq 429 | `meta.llm = "skipped:rate-limit"`, rule+lexicon results still render | empty results / error screen |
| F5 | URL is bot-walled (403) | `FETCH_FAILED`, UI suggests paste or fleet | hang past 8 s |
| F6 | URL → 10.0.0.1 / 169.254.169.254 / localhost | `BLOCKED_URL` before connecting | connect |
| F7 | Pasted 600 KB | `CONTENT_TOO_LARGE` with the cap named | crash |
| F8 | LLM returns a quote not in source | dropped silently, counted nowhere | displayed |
| F9 | prefers-reduced-motion | no typing animation, no scanlines, results appear instantly | motion |
| F10 | 390 px wide | zones stack, nothing overflows, fleet scrolls horizontally | horizontal page scroll |

## Risks & rollback
- Groq free-tier throttling during the demo video → deterministic path is complete on its own (F4). Record the video on a preloaded policy.
- Vercel Hobby 10 s → LLM timeout 6.5 s, `maxDuration = 10`.
- Rollback: greenfield repo; `git revert` per unit; production alias points at last good deploy (`vercel rollback`).
- Feature flag: LLM layer is off when `GROQ_API_KEY` is absent (default = deterministic only) — WHEN item satisfied.

## Out of scope
Auth, DB, history, accounts, multi-language, PDF upload, browser extension, the old tabloid brand, any second route. Recorded demo video (owner's, or a follow-up).

## Open questions (owner)
None blocking. Assumed: GitHub org `codeclawd` (per memory), public repo name `redflags-yard`, Vercel project of the same name. Both are reversible renames.

## Self-critique
- The lexicon's "meaning" strings are editorial; a wrong translation is a credibility hit in a vote. Mitigation: each meaning is hedged to what the phrase *permits*, never what the company *does*.
- Readability-extracted policy text may carry nav junk; the sentence splitter must tolerate it (test on all 8).
- Pirata One at small sizes is illegible — display only, ≥ 28 px.
