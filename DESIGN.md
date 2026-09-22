# Design — "Jolly Rouge BBS"

<!-- impeccable:design-schema 1 -->

The scanner is a privateer's terminal from a 1997 dial-up BBS. You pick a ship (a company's privacy policy), hail it, board it, search the hold, and hoist a red flag on every clause that would rob the passenger. The historical red pirate flag — the *Jolie Rouge* — meant "no quarter"; that is the joke and the product in one image. The page is a single console. On a laptop it is one composed screen with internal scrolling regions; on a phone the same regions stack and the page scrolls.

Mode: **Operate** (the visitor completes a task: pick, scan, read). Personality lives in the copy, the readouts and one boarding animation, never in the way of reading a quote.

## Palette (tokens — `app/globals.css` `@theme`)

| token | value | use |
|---|---|---|
| `--color-ink` | `#07111B` | page ground (night sea) |
| `--color-ink-2` | `#0D1B28` | panel ground |
| `--color-ink-3` | `#15283A` | raised panel / input ground |
| `--color-rope` | `#2C4257` | hairlines, dividers, rope rules |
| `--color-amber` | `#FFB000` | primary readout ink, focus ring, active |
| `--color-amber-dim` | `#B57C00` | secondary text on ink (tinted, never gray) |
| `--color-foam` | `#5FD3C7` | links, OK, "clean" states |
| `--color-blood` | `#D6202B` | critical flags, the pirate flag |
| `--color-ember` | `#F26B1D` | high |
| `--color-gold` | `#E4B848` | medium |
| `--color-parchment` | `#F1E6C8` | quote cards (the captured document) |
| `--color-parchment-2` | `#E3D3A8` | parchment edge / hover |
| `--color-quill` | `#2A1F12` | text on parchment |
| `--color-quill-dim` | `#6B563A` | secondary on parchment (tinted from quill) |

Contrast checked: amber on ink 10.6:1 · amber-dim on ink 5.1:1 · quill on parchment 12.7:1 · quill-dim on parchment 5.3:1 · foam on ink 9.4:1 · blood on ink 4.6:1 (large text / glyphs only; never body).

## Type

- Display: **Pirata One** (`next/font/google`, `--font-display`), only ≥ 28 px: the wordmark, rank label, score numerals' caption.
- Terminal readouts and the boarding log: **VT323** (`--font-terminal`), ≥ 18 px (VT323 is small at nominal size).
- UI, labels, body, quotes: **IBM Plex Mono** (`--font-mono`), 14–16 px body, tracking 0. Monospace is the world here (a terminal), not a costume — but the parchment quote cards set IBM Plex Mono at 15 px / 1.6 with a 68ch measure so a legal sentence reads like a document.
- Scale: 13 / 14 / 16 / 18 / 22 / 28 / 40 / 64. Headings balanced (`text-wrap: balance`). Display tracking -0.01em.

## Composition (desktop ≥ 1024)

```
┌ STATUS BAR ─ marquee ticker · UTC clock · "visitors: 000013" · Best viewed 1024×768 ┐
├──────────────┬────────────────────────────────────────┬────────────────────────────┤
│ HARBOR       │ DECK                                   │ DECODER RING               │
│ paste box    │ boarding log (terminal) →              │ phrase → what it permits   │
│ URL field    │ PLUNDER readout + rank + grade         │ (count) ; hover underlines │
│ [BOARD]      │ flags: hoisted red flags with          │ in the Hold                │
│              │ parchment quote cards                  │                            │
├──────────────┴────────────────────────────────────────┴────────────────────────────┤
│ FLEET LEDGER — 8 ships x 8 categories, pennant per category, score/grade/rank      │
├────────────────────────────────────────────────────────────────────────────────────┤
│ THE HOLD — full policy text, flagged sentences highlighted (collapsed by default)  │
└────────────────────────────────────────────────────────────────────────────────────┘
```
Revised 2026-09-22: the first paint is a finished boarding (a cached real scan), never an
empty state — a reader who is skimming must see the payoff, not the ask. The eight ships
live in the **fleet ledger** below the three columns rather than as cards in the Harbor,
which now holds only bring-your-own input; listing them twice starved the Harbor and broke
its layout.

Grid: `grid-cols-[280px_minmax(0,1fr)_300px]`, gaps 12 px, panels have 1 px `rope` borders with a 2 px inset amber corner tick (drawn with `::before`), 4 px radius. No cards-inside-cards: a flag is a list row; only the quote is a parchment card.

Mobile (< 1024): status bar → harbor → deck → decoder → hold, stacked; fleet becomes a horizontal snap-scroll row.

## Materials & browser surfaces

- Sea: a fixed SVG dither pattern at 4 % opacity on the ink ground, plus a very slow horizontal drift (60 s), off under reduced motion.
- CRT: 1 px scanlines at 6 % opacity over the Deck only; off under reduced motion.
- Selection: amber ground / ink text. Caret: amber. Scrollbars: 10 px, `rope` thumb on `ink-2`. Focus ring: 2 px amber, 2 px offset. Underline offset 3 px for decoder phrases (dotted gold).
- Shadows: parchment cards `0 2px 0 var(--color-parchment-2), 0 10px 24px -12px rgba(0,0,0,.6)`.
- Icons: lucide (`ship`, `ship-wheel`, `skull`, `anchor`, `flag`, `scroll-text`, `telescope`, `swords`, `scan-eye`, `fingerprint`, `eye-off`, `cookie`, `database`, `handshake`, `baby`, `hourglass`, `share-2`, `shield-alert`, `siren`, `globe`, `coins`, `crown`). One authored SVG: the Jolly Rouge flag (red field, white skull-and-crossed-keys) used as the wordmark and as each critical flag's glyph. No emoji anywhere.

## Motion — one authored moment: the boarding

On Board: the Deck clears, the terminal log types lines at ~28 ms/char with a blinking block cursor (`Hailing TikTok…`, `Reading the manifest… 27,555 chars`, `Searching the hold…`, `Parley with the quartermaster…` (LLM) / `No parley — rules only` (skipped), `3 flags hoisted.`). Then the PLUNDER numerals count up (exponential ease-out, 900 ms) and land exactly on the value; the rank label drops in with a 4 px overshoot; flags rise one by one (translateY 12 px → 0, clip-path inset bottom 100 % → 0, 60 ms stagger). Everything else is instant. Reduced motion: log appears complete, numerals static, no stagger.

## Copy voice

Terminal-deadpan with pirate nouns, never pirate spelling ("arr" is banned). Controls name actions: **Board**, **Paste a policy**, **Hail a URL**, **Open the hold**, **Copy the report**. Errors name the problem and the recovery: "The ship is bot-walled (403). Paste the text or pick one from the fleet." Score caption: "Plunder — how much of you they are allowed to take." LLM-off notice: "Parley skipped (rate-limited) — these flags are from the rulebook alone."

## Retro-internet set dressing (all drawn, all functional)

Marquee ticker (real `overflow` + `translateX` keyframe, paused on hover, off under reduced motion) carrying rotating facts from the results; a visitor counter that is the real session scan count in seven-segment VT323; an "Under boarding" barricade stripe as the scanning progress bar; a "webring" footer strip inside the screen: **Source** (repo) · **How it works** (overlay) · **Hackyard Yard #3 — built Sep 21–25 2026**. No `<blink>`, no GIFs, no fake "you are the 1,000,000th visitor".
