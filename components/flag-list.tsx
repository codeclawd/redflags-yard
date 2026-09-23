"use client";

import { Plus, Minus } from "lucide-react";
import type { Flag } from "@/lib/types";
import { CATEGORY_ICON, CATEGORY_LABEL, SEVERITY_COLOR, SEVERITY_LABEL } from "./severity";

/**
 * Display-only: a verdict repeated verbatim reads as a broken list rather than a
 * stronger finding. The engine keeps every grounded flag — "Copy the report" and
 * the policy-text highlighting still use all of them — but the list shows at most
 * three of any one headline.
 */
const MAX_PER_HEADLINE = 3;

function capRepeats<T extends { headline: string }>(flags: T[]): T[] {
  const seen = new Map<string, number>();
  return flags.filter((f) => {
    const n = seen.get(f.headline) ?? 0;
    seen.set(f.headline, n + 1);
    return n < MAX_PER_HEADLINE;
  });
}

const CONTEXT = 220;

/** The words either side of a quote, cut back to a word boundary. */
function surrounding(text: string, start: number, end: number) {
  const beforeRaw = text.slice(Math.max(0, start - CONTEXT), start);
  const afterRaw = text.slice(end, end + CONTEXT);
  const before = start > CONTEXT ? beforeRaw.replace(/^\S*\s/, "") : beforeRaw;
  const after = end + CONTEXT < text.length ? afterRaw.replace(/\s\S*$/, "") : afterRaw;
  return {
    before: (start > CONTEXT ? "…" : "") + before,
    after: after + (end + CONTEXT < text.length ? "…" : ""),
  };
}

export function FlagList({
  flags,
  openId,
  text,
  onToggle,
}: {
  flags: Flag[];
  openId: string | null;
  /** The policy text, when the page has it (a scanned link is read on the server). */
  text: string;
  onToggle: (flag: Flag) => void;
}) {
  if (flags.length === 0) {
    return (
      <p className="max-w-[62ch] py-4 text-[15px] text-foam">
        Nothing in this policy tripped the rulebook. The rulebook can miss things — read the
        policy yourself before you trust that.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-rope border-y border-rope">
      {capRepeats(flags).map((flag) => {
        const Icon = CATEGORY_ICON[flag.category];
        const open = openId === flag.id;
        const color = SEVERITY_COLOR[flag.severity];
        const inText = text.length > 0 && text.slice(flag.start, flag.end) === flag.quote;
        const context = inText ? surrounding(text, flag.start, flag.end) : null;

        return (
          <li key={flag.id} data-flag-row={flag.id}>
            <h3>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => onToggle(flag)}
                className={`flex w-full items-start gap-3 px-2 py-3.5 text-left transition-colors ${
                  open ? "bg-ink-2" : "hover:bg-ink-2"
                }`}
              >
                <span
                  aria-hidden
                  className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[3px] border"
                  style={{ borderColor: color, color }}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] leading-snug text-balance text-parchment">
                    {flag.headline}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] leading-none">
                    <span style={{ color }}>{SEVERITY_LABEL[flag.severity]}</span>
                    <span aria-hidden className="text-rope">·</span>
                    <span className="text-amber-dim">{CATEGORY_LABEL[flag.category]}</span>
                    {flag.source === "llm" ? (
                      <>
                        <span aria-hidden className="text-rope">·</span>
                        <span className="text-foam">found by the AI check</span>
                      </>
                    ) : null}
                  </span>
                </span>

                <span className="mt-1.5 flex shrink-0 items-center gap-1 text-[13px] text-amber">
                  {open ? (
                    <Minus aria-hidden className="size-3.5" strokeWidth={2} />
                  ) : (
                    <Plus aria-hidden className="size-3.5" strokeWidth={2} />
                  )}
                  <span className="sr-only sm:not-sr-only">{open ? "Hide" : "Show the sentence"}</span>
                </span>
              </button>
            </h3>

            {open ? (
              <div className="px-2 pt-1 pb-5 sm:pl-13">
                <p className="mb-3 max-w-[64ch] text-[15px] leading-[1.55] text-parchment">
                  {flag.plainEnglish}
                </p>
                <figure className="parchment max-w-[68ch] px-4 py-3.5">
                  <blockquote className="text-[15px] leading-[1.65] text-quill">
                    {context ? <span className="text-quill-dim">{context.before}</span> : "“"}
                    <mark className="receipt">{flag.quote}</mark>
                    {context ? <span className="text-quill-dim">{context.after}</span> : "”"}
                  </blockquote>
                  <figcaption className="mt-2.5 border-t border-parchment-2 pt-2 text-[13px] text-quill-dim">
                    Word for word from the policy, characters{" "}
                    {flag.start.toLocaleString("en-US")}–{flag.end.toLocaleString("en-US")}.
                  </figcaption>
                </figure>
                {flag.decoded ? (
                  <p className="mt-3 max-w-[64ch] text-[14px] text-amber-dim">
                    <span className="decoded">{flag.decoded.phrase}</span> — {flag.decoded.meaning}
                  </p>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
