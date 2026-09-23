"use client";

import { Plus, Minus } from "lucide-react";
import type { Flag } from "@/lib/types";
import type { ChargeGroup } from "./group-findings";
import { CATEGORY_ICON, CATEGORY_LABEL, SEVERITY_COLOR, SEVERITY_LABEL } from "./severity";

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

const span = (flag: Flag) =>
  `${flag.start.toLocaleString("en-US")}–${flag.end.toLocaleString("en-US")}`;

export function FlagList({
  groups,
  openHeadline,
  activeFlagId,
  text,
  onToggle,
  onPick,
}: {
  groups: ChargeGroup[];
  /** The charge whose sentences are showing. */
  openHeadline: string | null;
  /** The sentence shown in context here and marked in the policy pane. */
  activeFlagId: string | null;
  /** The policy text, when the page has it (a scanned link is read on the server). */
  text: string;
  onToggle: (group: ChargeGroup) => void;
  onPick: (flag: Flag) => void;
}) {
  if (groups.length === 0) {
    return (
      <p className="max-w-[62ch] py-4 text-[15px] text-foam">
        Nothing in this policy tripped the rulebook. The rulebook can miss things, so read the
        policy yourself before you trust that.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-rope border-y border-rope">
      {groups.map((group) => {
        const Icon = CATEGORY_ICON[group.category];
        const open = openHeadline === group.headline;
        const color = SEVERITY_COLOR[group.severity];
        const count = group.flags.length;
        const panelId = `charge-${group.flags[0].id}`;

        return (
          <li key={group.headline} data-group-row={group.headline} className="scroll-mt-4">
            <h3>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => onToggle(group)}
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
                    {group.headline}
                  </span>
                  {/* Each separator travels with the item after it, so a wrap never strands a dot. */}
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-none">
                    <span style={{ color }}>{SEVERITY_LABEL[group.severity]}</span>
                    <span className="whitespace-nowrap text-amber-dim">
                      <span aria-hidden className="text-rope">· </span>
                      {CATEGORY_LABEL[group.category]}
                    </span>
                    <span className="whitespace-nowrap tabular-nums text-parchment/80">
                      <span aria-hidden className="text-rope">· </span>
                      found in {count} sentence{count === 1 ? "" : "s"}
                    </span>
                  </span>
                </span>

                <span className="mt-1.5 flex shrink-0 items-center gap-1 text-[13px] text-amber">
                  {open ? (
                    <Minus aria-hidden className="size-3.5" strokeWidth={2} />
                  ) : (
                    <Plus aria-hidden className="size-3.5" strokeWidth={2} />
                  )}
                  <span className="sr-only sm:not-sr-only">
                    {open ? "Hide" : count === 1 ? "Show the sentence" : `Show all ${count}`}
                  </span>
                </span>
              </button>
            </h3>

            {open ? (
              <div id={panelId} className="px-2 pt-1 pb-5 sm:pl-13">
                <p className="mb-3 max-w-[64ch] text-[15px] leading-[1.55] text-parchment">
                  {group.plainEnglish}
                </p>
                <ol className="flex flex-col gap-3">
                  {group.flags.map((flag, index) => (
                    <Receipt
                      key={flag.id}
                      flag={flag}
                      index={index}
                      total={count}
                      text={text}
                      active={flag.id === activeFlagId}
                      onPick={onPick}
                    />
                  ))}
                </ol>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * One sentence of a charge, on parchment. The active one sits in its
 * surrounding policy text; the others show the sentence alone and open in
 * context on a click.
 */
function Receipt({
  flag,
  index,
  total,
  text,
  active,
  onPick,
}: {
  flag: Flag;
  index: number;
  total: number;
  text: string;
  active: boolean;
  onPick: (flag: Flag) => void;
}) {
  const inText = text.length > 0 && text.slice(flag.start, flag.end) === flag.quote;
  const context = active && inText ? surrounding(text, flag.start, flag.end) : null;
  const where =
    total > 1
      ? `Sentence ${index + 1} of ${total} · characters ${span(flag)}`
      : `Word for word from the policy, characters ${span(flag)}`;

  return (
    <li className="max-w-[68ch]" data-receipt={flag.id}>
      <button
        type="button"
        aria-pressed={active}
        onClick={() => onPick(flag)}
        className="parchment block w-full px-4 py-3.5 text-left transition-colors"
      >
        <span className="block text-[15px] leading-[1.65] text-quill">
          {context ? <span className="text-quill-dim">{context.before}</span> : "“"}
          <mark className="receipt">{flag.quote}</mark>
          {context ? <span className="text-quill-dim">{context.after}</span> : "”"}
        </span>
        <span className="mt-2.5 flex flex-wrap justify-between gap-x-3 gap-y-1 border-t border-parchment-2 pt-2 text-[13px] text-quill-dim">
          <span className="tabular-nums">
            {where}
            {flag.source === "llm" ? " · found by the AI check" : ""}
          </span>
          {active ? null : (
            <span className="text-quill underline decoration-dotted underline-offset-[3px]">
              Show it in context
            </span>
          )}
        </span>
      </button>
      {active && flag.decoded ? (
        <p className="mt-3 max-w-[64ch] text-[14px] text-amber-dim">
          <span className="decoded">{flag.decoded.phrase}</span>: {flag.decoded.meaning}
        </p>
      ) : null}
    </li>
  );
}
