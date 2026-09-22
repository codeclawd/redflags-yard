// Text utilities for the Red Flags engine.
//
// Design note (deviation from the plan, deliberate): `normalize` is
// LENGTH-PRESERVING — every substitution is one BMP code unit for one code
// unit, and whitespace is never collapsed. That is what makes the
// verbatim-quote guarantee mechanical: offsets computed against the
// normalized text index the ORIGINAL string identically, so a flag can be
// detected on cleaned-up text while its `quote` is sliced straight out of the
// raw source. `text.slice(start, end) === quote` therefore holds on the
// untouched policy text, not merely on a cleaned copy.

export interface Sentence {
  text: string;
  start: number;
  end: number;
}

const CHAR_MAP: Record<string, string> = {
  // quotes
  "‘": "'", "’": "'", "‚": "'", "‛": "'", "′": "'",
  "“": '"', "”": '"', "„": '"', "‟": '"', "″": '"',
  "«": '"', "»": '"',
  // dashes
  "‐": "-", "‑": "-", "‒": "-", "–": "-", "—": "-",
  "―": "-", "−": "-",
  // spaces and invisibles (kept as a single space so lengths line up)
  " ": " ", " ": " ", " ": " ", " ": " ", " ": " ",
  " ": " ", " ": " ", " ": " ", " ": " ", " ": " ",
  " ": " ", " ": " ", " ": " ", " ": " ", " ": " ",
  "　": " ", "­": " ", "​": " ", "‌": " ", "‍": " ",
  "﻿": " ", "⁠": " ",
  // line separators
  " ": "\n", " ": "\n", "\r": "\n",
  // misc
  "•": "*", "·": "*", "…": ".",
};

const CHAR_RE = new RegExp(
  "[" + Object.keys(CHAR_MAP).map((c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")).join("") + "]",
  "g",
);

/** 1:1 character cleanup. `normalize(s).length === s.length` always. */
export function normalize(s: string): string {
  return s.replace(CHAR_RE, (m) => CHAR_MAP[m]);
}

/** Lossy key used for de-duplication and comparison. Not offset-safe. */
export function normalizeForMatch(s: string): string {
  return normalize(s).toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim();
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Tokens that end in "." but do not end a sentence.
const ABBREVIATIONS = new Set([
  "e.g", "i.e", "etc", "vs", "cf", "al", "approx", "est", "no", "nos",
  "u.s", "u.k", "u.s.a", "e.u", "p.o",
  "inc", "ltd", "llc", "llp", "plc", "co", "corp", "gmbh", "sa", "bv", "nv",
  "mr", "mrs", "ms", "dr", "prof", "st", "jr", "sr",
  "fig", "figs", "art", "sec", "secs", "para", "paras", "pp", "vol", "ch",
  "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sept", "sep", "oct", "nov", "dec",
]);

const MAX_SENTENCE = 400;
const MIN_SENTENCE = 25;

function isAbbreviation(text: string, dotIndex: number): boolean {
  // Walk back over the token that the "." terminates.
  let i = dotIndex - 1;
  while (i >= 0 && /[A-Za-z.]/.test(text[i])) i--;
  const token = text.slice(i + 1, dotIndex).toLowerCase();
  if (!token) return false;
  if (ABBREVIATIONS.has(token)) return true;
  // Single initial ("J." in "J. Smith") or a dotted acronym ("U.S.").
  if (/^[a-z]$/.test(token)) return true;
  if (/^(?:[a-z]\.)+[a-z]$/.test(token)) return true;
  return false;
}

function isTerminator(text: string, i: number): boolean {
  const ch = text[i];
  if (ch !== "." && ch !== "!" && ch !== "?") return false;
  if (ch === "." && /\d/.test(text[i - 1] ?? "") && /\d/.test(text[i + 1] ?? "")) return false; // 3.5
  if (ch === "." && isAbbreviation(text, i)) return false;

  // Consume trailing closers: `."` `.)` `.”`
  let j = i + 1;
  while (j < text.length && /["')\]]/.test(text[j])) j++;
  if (j >= text.length) return true;
  // Readability strips the markup around headings, so the extracted text runs
  // them straight onto the previous sentence ("...user support.To review...").
  // Treat "<lowercase>.<Uppercase>" as a boundary; the abbreviation and initial
  // guards above already protect "U.S.Privacy" and "Inc.Our".
  if (/[A-Z]/.test(text[j])) {
    if (ch !== ".") return true;
    return /[a-z]/.test(text[i - 1] ?? "");
  }
  if (!/\s/.test(text[j])) return false;
  // Next non-space must look like a new sentence.
  let k = j;
  while (k < text.length && /\s/.test(text[k])) k++;
  if (k >= text.length) return true;
  return /[A-Z0-9"'(*•-]/.test(text[k]);
}

function pushTrimmed(out: Sentence[], source: string, rawStart: number, rawEnd: number): void {
  let s = rawStart;
  let e = rawEnd;
  while (s < e && /[\s*•|-]/.test(source[s])) s++;
  while (e > s && /\s/.test(source[e - 1])) e--;
  if (e - s < MIN_SENTENCE) return;

  // Hard-split anything too long to quote readably, preferring a clause break.
  while (e - s > MAX_SENTENCE) {
    const window = source.slice(s, s + MAX_SENTENCE);
    let cut = Math.max(window.lastIndexOf("; "), window.lastIndexOf(") "), window.lastIndexOf(", "));
    if (cut < 150) cut = window.lastIndexOf(" ");
    if (cut < 150) cut = MAX_SENTENCE;
    const piece = { start: s, end: s + cut + 1 };
    const t = source.slice(piece.start, piece.end).trim();
    if (t.length >= MIN_SENTENCE) out.push({ text: t, start: piece.start, end: piece.start + t.length });
    s = piece.end;
    while (s < e && /\s/.test(source[s])) s++;
  }
  if (e - s >= MIN_SENTENCE) out.push({ text: source.slice(s, e), start: s, end: e });
}

/**
 * Split into sentences, preserving offsets into `source`.
 * `source` is expected to already be `normalize`d (it is idempotent, so
 * passing raw text works too, offsets are identical either way).
 */
export function splitSentences(source: string): Sentence[] {
  const text = normalize(source);
  const out: Sentence[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\n") {
      pushTrimmed(out, source, start, i);
      start = i + 1;
      continue;
    }
    if (isTerminator(text, i)) {
      let j = i + 1;
      while (j < text.length && /["')\]]/.test(text[j])) j++;
      pushTrimmed(out, source, start, j);
      start = j;
    }
  }
  pushTrimmed(out, source, start, text.length);
  return out;
}

/**
 * Locate `quote` inside `source` and return ORIGINAL offsets, or null when it
 * cannot be grounded. Tolerant of case and whitespace runs; never invents a
 * position.
 */
export function groundQuote(source: string, quote: string): { start: number; end: number } | null {
  const hay = normalize(source);
  const needle = normalize(quote).trim();
  if (needle.length < 12) return null;

  let i = hay.indexOf(needle);
  if (i >= 0) return { start: i, end: i + needle.length };

  i = hay.toLowerCase().indexOf(needle.toLowerCase());
  if (i >= 0) return { start: i, end: i + needle.length };

  const words = needle.split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (words.length < 3) return null;
  const m = new RegExp(words.join("\\s+"), "i").exec(hay);
  return m ? { start: m.index, end: m.index + m[0].length } : null;
}

/** The sentence containing `offset`, or null. */
export function sentenceAt(sentences: Sentence[], offset: number): Sentence | null {
  for (const s of sentences) if (offset >= s.start && offset < s.end) return s;
  return null;
}
