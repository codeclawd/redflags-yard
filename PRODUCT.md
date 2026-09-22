# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Next.js 16 (App Router, Turbopack), TypeScript strict, Tailwind CSS 4, Vercel. Delegated: chosen because the owner's prior version shipped on this stack and Vercel is the deploy target; the hackathon brief is a single-screen web app.

## Users
People about to sign up for an app or service who want to know, in under a minute, what its privacy policy actually lets the company do to them. They arrive with a URL or a wall of pasted legal text and no legal training. Secondary audience during Sept 21–27 2026: the 29 other Hackyard Yard #3 builders voting on entries, who will judge it from a demo video and a 60-second play.

## Product Purpose
Red Flags reads a privacy policy and returns ranked, verbatim-quoted red flags plus a "decoder ring" that translates innocuous-sounding phrases ("trusted partners", "improve our services", "affiliates", "de-identified") into what they let the company do. Success: a visitor pastes or picks a policy, and within ~5 seconds sees (1) a plunder score, (2) the worst clauses with the exact sentence highlighted, (3) the euphemisms decoded. Everything happens on one screen.

## Positioning
Every quote is verbatim from the source and mechanically verified as a substring before display — the scanner cannot hallucinate a clause. The decoder ring targets the specific failure of other summarizers: language that *sounds* harmless. Hackathon-specific truth: the entire codebase was written during the Yard #3 build week (Sept 21 18:00 UTC → Sept 25 18:00 UTC); the idea predates it, the code does not.

## Operating Context
- Hackyard Yard #3, theme "One Screen": the whole app lives in a single view. No routes, no navigation, no second page. Scrolling, modals/overlays, tabs/panels, expand/collapse are allowed.
- Judged by community vote (30 solo builders), based on a public repo, a demo video and a screenshot. First impression on a laptop screen matters more than depth.
- Deployed on Vercel Hobby (10 s function limit). Groq free tier is the LLM (rate-limited; the deterministic passes must carry the demo when Groq throttles).
- Fetching arbitrary URLs is unreliable (bot-walled sites), so preloaded policies are the primary demo path; URL and paste are secondary.

## Capabilities and Constraints
- Inputs: choose a preloaded policy · paste text · paste a URL (server fetch with SSRF guard).
- Detection: deterministic sentence-level rule pass (categories + severity ceilings + a conditionality firewall that suppresses law-enforcement/consent/negated sentences) · euphemism lexicon pass (the decoder ring) · optional Groq LLM pass for what the rules miss, with entailment verification and a hard substring check.
- Output: flags ranked by severity then score, each with headline, plain-English meaning, verbatim quote and source offsets; plunder score 0–100 with a rank label; decoder ring entries with counts.
- Constraints: one screen (no routes); Groq is never called from tests; no database, no auth, stateless; the API route `/api/scan` is not a page.
- Terminology: "flag" (a finding), "decoder ring" (the euphemism translation list), "plunder score" (0–100, higher = worse for you), "fleet" (the preloaded policies).

## Brand Commitments
Name: **Red Flags**. Owner-pinned direction (binding): creative, privacy-themed, *fun*: OG retro-internet / hacker vibes and pirate imagery (the historical red pirate flag meant "no quarter"). Explicitly NOT a "boring corporate privacy logger" and NOT a rerun of the previous tabloid look. Component libraries obsidianui.dev and 21st.dev are allowed sources.

## Evidence on Hand
- Eight real, full-text privacy policies fetched 2026-09-21 from the companies' own sites, stored under `public/policies/*.json` with source URL and fetch date: Discord, Google, LinkedIn, Snap, Spotify, Temu, TikTok, Zoom. Do not fabricate policies or verdicts; every flag must quote the stored text.
- No testimonials, no press, no user counts. Do not invent any.

## Product Principles
1. Verbatim or nothing — a flag without a substring-verified quote is dropped.
2. Bias to false negatives — over-suppress rather than over-flag; conditionality (law enforcement, consent, negation) is a firewall, not a footnote.
3. Decode the euphemism, don't just detect it — the value is the translation.
4. The deterministic path must be a complete product on its own; the LLM is a bonus layer.
5. One screen, first impression in five seconds, fun without lying.

## Accessibility & Inclusion
Keyboard-operable end to end; contrast ≥ 4.5:1 for body text even on the retro palette; `prefers-reduced-motion` respected for CRT/scanline/sea effects.
