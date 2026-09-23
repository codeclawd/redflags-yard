# Design — "Jolly Rouge BBS": the WANTED poster

<!-- impeccable:design-schema 1 -->

The company is the pirate. The first viewport is a WANTED poster for it: one aged-parchment sheet pinned to a dark sea, wanted **for taking** the things its privacy policy lets it take. That inversion is the joke a stranger gets without a legend. Everything else on the page is plain English. The historical red pirate flag — the *Jolie Rouge*, "no quarter" — survives as the one skull-and-keys mark on the poster.

Mode: **Operate** (the visitor completes a task: pick or paste, scan, read the receipts). Personality lives in the poster and one assembly animation, never in a control label or in the way of reading a quote.

## Vocabulary rule (binding)

A pirate word may appear only where the joke carries its own meaning without a legend: **WANTED**, the poster itself, the rank as a small flavour line under the score that explains itself in place ("Rank: Ghost ship, the worst of five ranks", with a five-step ladder and the current step filled), and the skull mark. Every control, heading, status line, empty state and error is plain English. The words Harbor, Hail, Board, anchor, boardings, Deck, parley, hoisted, "the hold", plunder, Fleet ledger and pennant do not appear in user-visible text (code identifiers such as `FleetMatrix` or `hold-ranges` keep their old names). The LLM pass is called the **AI check**; the decoder ring is called **Weasel words**; a **charge** is one distinct headline, and each charge is **found in** one or more **sentences** (the engine's flags); every count on the page says "N charges, found in M sentences" or "See all N charges", never a flag count as a charge count; never write toggle-speak such as "rules only" or "AI check off"; the score is a **risk score** out of 100, higher is worse for you, with a letter grade.

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
| `--color-parchment` | `#F1E6C8` | the WANTED poster, receipt cards, body text on ink |
| `--color-parchment-2` | `#E3D3A8` | parchment edge / hover |
| `--color-quill` | `#2A1F12` | text on parchment |
| `--color-quill-dim` | `#6B563A` | secondary on parchment (tinted from quill) |

Contrast checked: amber on ink 10.6:1 · amber-dim on ink 5.1:1 · quill on parchment 12.7:1 · quill-dim on parchment 5.3:1 · foam on ink 9.4:1 · blood on ink 4.6:1 (large text / glyphs only; never body) · blood on parchment 4.1:1 (poster display type and the grade stamp only) · amber-dim on ink-3 4.2:1, so inputs sit on `ink` (5.1:1 for the placeholder).

## Type

- Display: **Pirata One** (`next/font/google`, `--font-display`), ≥ 20 px (≥ 28 px on desktop): the wordmark, the poster lettering (WANTED / No bounty, the company name, "for taking", the score numerals and the grade stamp) and section headings (Check your own, The evidence, Weasel words, Compare 8 apps, The policy, word for word).
- **VT323** (`--font-terminal`), ≥ 18 px, survives only in the overlays (How it works step names, the copy-report confirmation).
- UI, labels, body, quotes: **IBM Plex Mono** (`--font-mono`), 14–16 px body, tracking 0. Monospace is the world here (a terminal), not a costume — but the parchment quote cards set IBM Plex Mono at 15 px / 1.6 with a 68ch measure so a legal sentence reads like a document.
- Poster type is sized in container units of the poster (`cqw`) capped by viewport height (`dvh`), so WANTED, the name, the number and the skull stay legible when the whole frame is downscaled to a 400 px card. Page scale: 13 / 14 / 15 / 16 / 28 / 34 / 40. Headings balanced (`text-wrap: balance`). Display tracking -0.01em.

## Composition

One page, no routes. Scrolling is allowed; overlays are used only for How it works and Copy the report.

```
header ─ "Red Flags" wordmark · "Paste any privacy policy. See what it lets them take." · How it works
┌──────────── first viewport (desktop ≥ 1024) ────────────┐
│  WANTED POSTER (≤ 600 px)        │  CHECK YOUR OWN panel  │
│  skull-and-keys mark (once)      │  Paste a privacy policy│
│  WANTED                          │  …or paste a link to one
│  <Company>                       │  [Scan the link / Scan │
│  for taking                      │   the pasted text]     │
│  3–4 plain-English charges       │  status line           │
│  84/100  (F) stamp               │  Or try one: 8 chips   │
│  Risk score out of 100 · …       │                        │
│  ▢▢▢▢■ Rank: Ghost ship, the worst of five ranks          │
│  "Saved scan of TikTok's policy, <date>" · "See all N charges ↓"
└───────────────────────────────────────────────────────────┘
THE EVIDENCE (list, in-flow expansion)   │ THE POLICY, WORD FOR WORD
WEASEL WORDS                              │ (sticky pane, scrolls itself
                                          │  to the opened charge/phrase)
COMPARE 8 APPS (full width; a row scans that app; below lg the app + score
               stay pinned and the 8 columns scroll sideways under a hint + edge fade)
footer ─ Source · How it works · Hackyard Yard #3 · Not legal advice
```

- **Poster.** Charges are the most severe distinct categories found (`topCharges`, max 4), in the reader's words ("your face and voice", "your words to train AI", "where you are"). Each charge line is a button (a faint dotted quill underline, solid on hover and focus, a quill focus ring since amber vanishes on parchment): it scrolls to The evidence, opens that charge's group, shows its first sentence in context and marks it in the policy pane, and moves focus to the opened row. A policy with **no** findings never gets a WANTED poster: it reads **No bounty**, no skull, "Nothing in this policy tripped the rulebook. Read it yourself before you trust that.", and a quill-coloured grade stamp.
- **Provenance** sits under the poster in plain words: "Saved scan of TikTok's policy, 23 Sept 2026" on the committed first paint, "Scanned just now" after a live scan. Whether the AI check ran is said once, where it matters, at the end of The evidence's lede: "The AI check didn't run this time: these come from the rules alone." (or "ran out of time", "was busy", "failed this time"). The Compare footnote says the same of the saved scans.
- **Check your own.** The field edited last is the one scanned (`pickSource` in `components/scan-source.ts`); if both fields hold text the idle one dims and says "not used", and the button names its source. A chip scans that app immediately.
- **The evidence.** One row per charge (distinct headline), grouped by the pure `groupFindings` in `components/group-findings.ts`: worst severity first, then most sentences, and the row's meta line says "found in 9 sentences". The lede reads "15 charges against TikTok, found in 30 sentences, worst first", and the poster's "See all 15 charges" uses the same count. A row opens in place and pushes content down (nothing is height-constrained, so opening one never squeezes the input panel). Open, it shows the plain-English meaning, then one parchment receipt per sentence in policy order ("Sentence 3 of 9 · characters 12,945–13,087"). The active receipt, the first on opening, shows its quote highlighted inside ~220 characters of the surrounding policy text; the others show the sentence alone with "Show it in context", and clicking one makes it active. On desktop the sticky policy pane beside it scrolls (itself, never the page) to the active sentence. "Copy the report" lists the worst five charges with their sentence counts and counts the rest.
- **Mobile (< 1024).** header → poster → Check your own → The evidence → Weasel words → Compare 8 apps → the policy text. Compare keeps all 8 columns: the app name and score are sticky on the left, the columns scroll sideways, a "Swipe sideways for all 8 columns" hint shows whenever they overflow, and an ink edge fade sits on the right until the last column is in view.

## Materials & browser surfaces

- Sea: a fixed SVG dither pattern at 4 % opacity on the ink ground, plus a very slow horizontal drift (60 s), off under reduced motion.
- Parchment poster: `--color-parchment` ground, an edge burn (radial gradient), fine grain plus long fibres from two inline SVG `feTurbulence` filters multiplied into the paper, a seeded deckled `clip-path` edge (same outline on server and client), two drawn tacks, and a soft offset `drop-shadow`. No raster images.
- Grade stamp: a ring and an inner ring in `--color-blood`, multiplied into the paper.
- Selection: amber ground / ink text. Caret: amber. Scrollbars: 10 px, `rope` thumb on `ink-2`. Focus ring: 2 px amber, 2 px offset. Underline offset 3 px for decoder phrases (dotted gold).
- Shadows: parchment cards `0 2px 0 var(--color-parchment-2), 0 10px 24px -12px rgba(0,0,0,.6)`.
- Icons: lucide, one per charge category (`fingerprint`, `database`, `scan-eye`, `globe`, `coins`, `handshake`, …) coloured by severity, plus `scan-search`, `plus`/`minus`, `arrow-down`, `share-2`. One authored SVG: the Jolly Rouge flag (red field, white skull-and-crossed-keys), used **once**, large, on the poster. The Compare table's "found" mark is a small drawn red flag. No emoji anywhere.

## Motion — one authored moment: the poster assembles

On a live scan the old poster dims while the scan runs (a striped progress bar under the button). When the result lands the poster remounts and assembles: the skull flag stamps down (scale 1.6 → 1, rotate −14° → −3°), the charges rise and unblur one by one (80 ms stagger), the number counts up with an exponential ease-out over 900 ms and snaps to the exact score on its last frame, and the grade stamp lands last (scale 1.8 → 1, rotate 24° → 8°). Everything else is instant. The cached first paint does **not** animate, and neither does anything under `prefers-reduced-motion`.

## Copy voice

Plain, deadpan English. Controls name actions: **Scan the link**, **Scan the pasted text**, **Show the sentence**, **Copy the report**. Errors name the problem and the recovery: "That site would not let us read the page. Open the policy yourself, copy the text and paste it here."

## Removed set dressing (2026-09-22)

The marquee ticker, the UTC clock and the "boardings" counter are gone: cold reviewers read them as manufactured urgency competing with the score. The skull is no longer a bullet on every critical row. The sea dither drift and the footer strip remain.
