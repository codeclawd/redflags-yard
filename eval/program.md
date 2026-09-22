# autoresearch — Red Flags detection quality

## Goal (the ONE number)

Minimize **weighted error rate** of the deterministic detector on a frozen, independently
labeled corpus of 240 real policy sentences:

    metric = (2 * false_positives + false_negatives) / 240 * 100

False positives are weighted 2x because the product's stated principle is **bias to false
negatives** (PRODUCT.md, Principle 2), and because a voter who sees one junk flag discounts
every other flag on the screen. Lower is better. A perfect detector scores 0.

## Why this metric and not "likelihood to win the vote"

The user's actual goal is winning the Hackyard Yard #3 community vote. That goal fails the
autoresearch FIT CHECK: there is no objective oracle for it, and its feedback arrives exactly
once, after the deadline (n=1, unusable for steering). It cannot be looped.

Detection quality is the largest *loopable* component of it: the scanner's credibility under a
voter who pastes their own app's policy. Design changes that research says drive votes
(glanceable artifact, score spread) are handled separately as ordinary engineering, not by
this loop.

## The three files

- **ASSET** (the loop edits these freely): `lib/rules.ts`, `lib/lexicon.ts`, `lib/firewall.ts`,
  `lib/scan.ts` (selection/merge/rank logic only).
- **SCORING** (FROZEN — never edit): `eval/gold.json`, `eval/score.mjs`, `eval/sample.mjs`.
- **INSTRUCTIONS**: this file. Human-only.

## Rules

- `eval/gold.json` was labeled independently of detector output. Never regenerate it, never
  relabel an item because the detector disagrees, never drop an item that the detector fails.
  If a label is genuinely wrong, stop and raise it with the human — do not quietly fix it.
- The scan under evaluation runs with `{llm:false}`. **Groq is never called by the loop.**
- `GUARD_CMD="pnpm test"` runs the real 181-test vitest suite every round. A metric win with a
  guard failure is a REVERT.
- Simplicity criterion: a win from deleting a rule or a lexicon entry beats a win from adding one.
