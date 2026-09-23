# Red Flags — win-readiness pass: two trust bugs + first-frame redesign

Date: 2026-09-22 · Branch: main (lanes in worktrees) · Status: EXECUTING · Scope: engine fix, input bug, first-frame redesign, demo video · Depends-on: `2026-09-21-redflags-yard3-one-screen.md` (shipped)

## Context / why

I want to **fix the two bugs that contradict the product's own promises and rebuild the first frame** so that I can **submit an entry that survives a 400 px card and a 5-second glance against two prior champions** by **correcting the negation firewall and input precedence, then recomposing the first viewport around one legible verdict.**

The owner asked whether this is good enough to win and said not to submit unless it is. Three independent cold reviewers (spectator, rival builder, design critic) plus my own isolated pass say it is not, yet. Field for Yard #3 (hackyard.tech/yards/yard-3, read 2026-09-22 23:55 UTC): 30/30 builders including **@headzoo** (Yard 1 Top 3, Yard 2 Champion) and **@mikekovetsky** (Yard 1 Champion). One competitor live: *The Kept Page* (@jimsavvy), an 11.7 s silent vertical demo of a typography toy.

## Current state (VERIFIED)

Evidence from `/tmp/rf-capture/*` (isolated Playwright 1.63, own browser) and the three reviews.

- **Negation false positive.** `lib/firewall.ts:10-25` `NEGATION_GUARDS`: every verb-bearing guard enumerates verbs — `not\s+(?:sell|share|disclose|rent|trade|use|collect|retain)` (:18), `does\s+not\s+(?:sell|share|disclose|rent|trade|permit|allow)` (:21), `(?:do|does)\s+not\s+(?:carry\s+out|engage\s+in|perform|conduct)` (:13). **Negative evidence:** `track` appears in none. Reproduced by rival builder on live `mozilla.org/en-US/privacy/websites/`: flag #1 = `cross_site_tracking · Critical` quoting *"Mozilla does not track users across third-party websites to provide targeted advertising."* Mechanism: an explicit verb allowlist that omits the verbs of the tracking, profiling, location and AI-training categories.
- **Stale input wins.** `app/page.tsx:111` `const usingPaste = !ship && pasted.trim().length > 0;` — fixed precedence paste > url. Rival builder reproduced twice: text in paste box, then a URL → the old paste is scanned, URL silently dropped.
- **Layout collapse.** `app/page.tsx:257` `lg:h-dvh lg:overflow-hidden` + `:260` `lg:grid-rows-[minmax(0,1fr)_auto]`: the top row is the only elastic region; the ledger (`auto`) never yields. Expanding any flag opens the hold (`components/hold.tsx:77` `lg:max-h-[20vh]`), the top row is squeezed, `components/harbor.tsx:62` textarea (`min-h-0 lg:flex-1`) collapses to 0 and the two `shrink-0` labels overlap. Captured: `/tmp/rf-capture/shots/02-flag-open.png`.
- **Thumbnail illegible.** `/tmp/rf-capture/shots/thumb-400.png`: only "84" readable. Design critic: "a dark rectangle with a small orange 84 blob … looks like a generic dark-mode admin dashboard."
- **5-second test failed.** Spectator's first guess: *"some kind of pirate-themed game about ships."*
- **Jargon.** Flagged independently by all three reviewers: Harbor, Hail a URL, Board, at anchor, boardings, Deck, parley, hoisted, the hold, plunder, Fleet ledger, pennant, Ghost ship/Pirate/Smuggler (no legend), "cached scan · rules only, no parley".
- **Noise.** Marquee ticker competes with the score for the #1 slot (critic); ticker + UTC clock + "boardings 000000" read as "manufactured urgency" (spectator). Only interval in the codebase is the clock: `components/status-bar.tsx:27`.
- **Refuted, recorded so they are not re-chased:** "autoplay loop", "auto-typed text", "flag expand triggers re-scan", "Spotify row shows TikTok" — all reproduced as FALSE in an isolated browser (idle 30 s → 0 `/api/scan` requests; flag expand → 0; Spotify row → exactly `{"policyId":"spotify"}`, deck shows Spotify 76/D). Cause: three reviewers shared one Playwright MCP browser. My orchestration error.
- **Verified strengths to keep:** theme fit clean (modal leaves URL unchanged, no routes); repo timing honest (`gh api`: created 2026-09-22T03:08:33Z, 31 commits all in window); verbatim offsets hold; clean policy → 0 flags; hand-written euphemism caught by the LLM pass; the flag → source-highlight interaction called "genuinely good, trust-building" by the spectator.

## Decision + rationale

**Keep the engine, the pirate world, and the one-page model. Recompose the first viewport around a single WANTED poster for the company, and put every control and label in plain English.**

| Option | Thumbnail | 5-s read | One-screen feel | Risk | Pick |
|---|---|---|---|---|---|
| A. Polish current dashboard (fix jargon, bugs) | still "dark rectangle" | improves slightly | strong | low | no — does not fix the first impression, which is what loses cards |
| **B. WANTED-poster hero + plain labels, depth below / in overlays** | poster reads at 400 px | "this company is wanted for taking my data" | strong in first viewport | medium | **yes** |
| C. New visual world (drop pirate) | depends | depends | — | high, and the owner pinned the pirate/retro brief | no |

Why the poster: it inverts the pirate joke so a stranger gets it without a legend (the company is the pirate, wanted for what it takes), it is the one bright parchment object on a dark sea (fixes the flat same-texture hierarchy), and it is large display type (survives downscaling). The owner's own framing of the feature, "words that sound normal but hide things", becomes the plain label **Weasel words**.

**Vocabulary rule (binding):** a pirate word may appear only where the joke carries the meaning on its own (WANTED, the poster, rank as a flavour subtitle beside a letter grade). Every control, heading, and status line is plain English.

## Units of work

### U1 — Negation firewall (lead, `lib/`)
- `lib/firewall.test.ts`: add a failing case first — `"Mozilla does not track users across third-party websites to provide targeted advertising."` must be `isNegated === true`, plus "X does not monitor/profile/record/share…". **Run it red on current code before fixing.**
- `lib/firewall.ts:10-25`: add a subject-agnostic guard over the harm verbs of every category:
  `/\b(?:do|does|did|will|would)\s+not\s+(?:track|monitor|profile|target|combine|link|record|store|keep|access|read|listen|scan|analy[sz]e|train|transfer|buy|license|infer|fingerprint|sell|share|disclose|rent|trade|use|collect|retain)\b/i` and the same verbs after `never`.
- Acceptance: new test green; `./eval/run_experiment.sh` → `correct: true`, `guard: pass`, metric ≤ 41.95 (no regression on the frozen corpus); `pnpm test` all pass.

### U2 — Redesign + input bug (UI lane, `app/`, `components/`, `DESIGN.md`, worktree `/tmp/rf-redesign`)
Full brief in the lane prompt. Must deliver: WANTED-poster hero; "Check your own" input in the first viewport with last-edited-source-wins (fixes `page.tsx:111`); plain-English labels everywhere per the vocabulary rule; remove marquee, clock, boardings counter; skull used once, large; no fixed-height squeeze (fixes the collapse); mobile order hero → input → evidence; the flag → source-highlight moment kept and made prominent.

### U3 — Re-bake + merge (lead)
After U1 and U2: merge, `pnpm bake`, full gate, deploy.

### U4 — Demo video (lead)
Scripted Playwright `recordVideo` at 1920×1080 against production → H.264 MP4 with burned-in captions (the competitor's is silent; no narration needed). Upload target YouTube/Vimeo/Loom (plays inline per FAQ) is the owner's account.

### U5 — Independent re-review (fresh agents, **one isolated browser each**)
Same three personas, each with its own standalone Playwright process, not the shared MCP browser.

## Sequencing

```
U1 (lead, lib/) ─┐
                 ├─► U3 merge + re-bake + deploy ─► U4 video ─► U5 re-review ─► submit / iterate
U2 (worktree) ───┘
```
U1 ∥ U2: disjoint files. U2 must not regenerate `public/baked/*` (it would use the pre-U1 engine); the lead re-bakes in U3.

## Verification (contract)
1. `pnpm tsc --noEmit` 0 · `pnpm lint` 0 · `pnpm test` all pass · `pnpm build` routes only `/`, `/_not-found`, `/api/scan`.
2. `grep -rn "next/link\|useRouter" app components` → 0 hits.
3. Eval: `./eval/run_experiment.sh` → `correct: true`, `guard: pass`, metric ≤ 41.95.
4. Mozilla sentence: `scan()` returns no flag whose quote contains "does not track".
5. Stale input: paste text, then type a URL → the request body is `{"url":…}` (checked by intercepting `/api/scan` in Playwright).
6. Layout: expand a flag at 1440×900 → the input textarea's bounding height > 60 px and the two labels do not overlap (`getBoundingClientRect` y-ranges disjoint).
7. Jargon: `grep -rniE "hail a url|at anchor|boardings|parley|hoisted|the hold|plunder|pennant" app components` → 0 hits in user-visible strings.
8. Thumbnail: a 400 px-wide render of the first frame, judged by a fresh reviewer who is not told what the app does, names it correctly.
9. U5: three isolated reviewers; report their verdicts verbatim.

## Edge cases
| # | Scenario | Expected | Never |
|---|---|---|---|
| F1 | "X does not track you across sites" | no flag | Critical flag |
| F2 | "We share data with partners to track you across sites" | still flagged | suppressed by the broader negation guard |
| F3 | Paste, then URL | URL scanned | stale paste scanned silently |
| F4 | URL, then paste | paste scanned | stale URL |
| F5 | Expand a flag on 1440×900 | input stays usable | overlap / collapse |
| F6 | 0-flag policy | poster reads as "clean", not "wanted" | a WANTED poster for an honest policy |
| F7 | Groq rate-limited | rules-only result, plain notice | error screen |

## Risks & rollback
- Broader negation guard could suppress true positives (F2). Mitigation: the frozen eval corpus + guard gate every change; test F2 explicitly. Rollback: revert the U1 commit.
- Redesign regresses something reviewers liked. Mitigation: U5 re-review; keep the engine and API untouched. Rollback: `vercel rollback` to the current production deployment; `git revert` the merge.
- No feature flag: this is a pre-submission build with no users; rollback is the redeploy above. (WHEN item, skipped with reason.)

## Out of scope
New detection categories; changes to scoring; the fetch/SSRF path; accounts; any second route; uploading the video to the owner's YouTube (needs their login); submitting on hackyard.tech (needs their login).

## Open questions (owner)
None blocking. Upload + submit require the owner's accounts and are handed over at the end.

## Self-critique
- The poster is my synthesis of one reviewer's suggestion plus my own idea; it is unvalidated until U5 sees it cold.
- Three LLM reviewers are not 30 humans. They agreed with each other, which is signal, but not proof.
- A scrolling single page is theme-legal (FAQ: "Allowed: scrolling"), but a voter might read a tight fixed dashboard as more "one screen". The first viewport must feel complete on its own.
