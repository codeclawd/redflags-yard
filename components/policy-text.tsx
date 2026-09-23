"use client";

import { useEffect, useMemo, useRef } from "react";
import type { DecodedPhrase, Flag } from "@/lib/types";
import { buildHoldRanges, segmentHold } from "./hold-ranges";
import { SEVERITY_COLOR } from "./severity";

/**
 * The whole policy, word for word, with every charge and weasel word marked.
 * Opening a charge or a weasel word scrolls this pane — only this pane, never
 * the page — to the sentence, so nothing else on screen moves.
 */
export function PolicyText({
  text,
  name,
  flags,
  decoder,
  activeFlagId,
  activePhrase,
}: {
  text: string;
  name: string;
  flags: Flag[];
  decoder: DecodedPhrase[];
  activeFlagId: string | null;
  activePhrase: string | null;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  const segments = useMemo(
    () => segmentHold(text, buildHoldRanges(flags, decoder, text.length)),
    [text, flags, decoder],
  );

  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const target = activeFlagId
      ? box.querySelector<HTMLElement>(`[data-flag-id="${CSS.escape(activeFlagId)}"]`)
      : activePhrase
        ? box.querySelector<HTMLElement>(`[data-phrase="${CSS.escape(activePhrase)}"]`)
        : null;
    if (!target) return;
    box.scrollTop = target.offsetTop - box.clientHeight / 3;
  }, [activeFlagId, activePhrase, segments]);

  return (
    <section
      aria-labelledby="policy-heading"
      className="panel flex min-h-0 flex-col gap-3 p-4 lg:max-h-[calc(100dvh-2rem)]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2
          id="policy-heading"
          className="font-display text-[28px] leading-none tracking-[-0.01em] text-parchment"
        >
          The policy, word for word
        </h2>
        <span className="text-[13px] text-amber-dim tabular-nums">
          {text.length > 0 ? `${name} · ${text.length.toLocaleString("en-US")} characters` : name}
        </span>
      </div>

      {text.length > 0 ? (
        <>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-amber-dim">
            <span>
              <mark className="charge" style={{ ["--mark" as string]: "var(--color-blood)" }}>
                marked
              </mark>{" "}
              = a charge
            </span>
            <span>
              <span className="decoded">dotted</span> = a weasel word
            </span>
          </p>
          <div
            ref={scroller}
            tabIndex={0}
            role="region"
            aria-label={`${name} privacy policy text`}
            className="relative max-h-[70dvh] min-h-0 overflow-y-auto border border-rope bg-ink p-4 lg:max-h-none lg:flex-1"
          >
            <p className="max-w-[72ch] text-[14px] leading-[1.75] whitespace-pre-wrap text-parchment/75">
              {segments.map((segment, index) => {
                if (!segment.range) return <span key={index}>{segment.text}</span>;
                if (segment.range.kind === "flag") {
                  return (
                    <mark
                      key={index}
                      className="charge"
                      data-flag-id={segment.range.flagId}
                      data-active={segment.range.flagId === activeFlagId}
                      style={{ ["--mark" as string]: SEVERITY_COLOR[segment.range.severity] }}
                    >
                      {segment.text}
                    </mark>
                  );
                }
                return (
                  <span
                    key={index}
                    className="decoded"
                    data-phrase={segment.range.phrase}
                    data-active={segment.range.phrase === activePhrase}
                  >
                    {segment.text}
                  </span>
                );
              })}
            </p>
          </div>
        </>
      ) : (
        <p className="text-[14px] text-amber-dim">
          A scanned link is read on the server, so its full text is not shown here. Every charge
          still carries its exact quote.
        </p>
      )}
    </section>
  );
}
