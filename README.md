# Red Flags

Board a privacy policy. Hoist a red flag on every clause that would rob you.

Red Flags reads a privacy policy and returns ranked findings, each one quoting the exact sentence from the source, plus a **decoder ring** that translates the phrases that sound harmless — "trusted partners", "improve our services", "affiliates", "de-identified" — into what they actually let a company do.

Built for [Hackyard Yard #3](https://hackyard.tech/yards/yard-3), theme **"One Screen"**: the whole app lives in a single view. No routes, no navigation, no second page.

## What it does

1. **Pick a ship** from the fleet (eight real privacy policies, fetched from the companies' own sites on 2026-09-21), paste a policy, or hail a URL.
2. **Board.** A deterministic rule pass and a euphemism lexicon search every sentence. If a Groq key is configured, an LLM pass (gpt-oss-120b) looks for what the rules missed, and a second model checks that each finding is actually supported by its quote.
3. **Read the flags.** Each flag has a plain-English verdict and the verbatim sentence, highlighted in the full policy text. The **plunder score** (0–100, higher is worse for you) and a rank from *Honest merchant* to *Ghost ship* summarize the damage.

## The guarantee

A flag is shown only if its quote is a character-for-character substring of the source text. Every quote carries its start and end offset; the test suite asserts `text.slice(start, end) === quote` for every flag across all eight policies. The model cannot invent a clause.

The engine is biased toward false negatives: a sentence about disclosures to law enforcement, one that names consent or opt-in, or one that negates the harm ("we do not sell") is suppressed before it can become a flag.

## Stack

Next.js 16 · TypeScript · Tailwind CSS 4 · Vercel AI SDK 7 + Groq · Vitest.

```bash
pnpm install
cp .env.example .env.local   # add GROQ_API_KEY (optional; without it the scanner runs rules-only)
pnpm dev
pnpm test
```

Tests never call Groq; the LLM module short-circuits under Vitest.

## Hackathon note

The idea predates this week. The code does not: every file in this repository was written between Sep 21 18:00 UTC and Sep 25 18:00 UTC 2026, per the Yard #3 rule *"The idea can be old. The code cannot."*

## License

MIT.
