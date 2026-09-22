"use client";

import { useEffect, useMemo, useRef } from "react";
import { ScrollText } from "lucide-react";
import type { DecodedPhrase, Flag } from "@/lib/types";
import { buildHoldRanges, segmentHold } from "./hold-ranges";
import { SEVERITY_COLOR } from "./severity";

export function Hold({
  text,
  flags,
  decoder,
  open,
  activeFlagId,
  activePhrase,
  note,
  onToggle,
}: {
  text: string;
  flags: Flag[];
  decoder: DecodedPhrase[];
  open: boolean;
  activeFlagId: string | null;
  activePhrase: string | null;
  note: string | null;
  onToggle: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  const segments = useMemo(
    () => segmentHold(text, buildHoldRanges(flags, decoder, text.length)),
    [text, flags, decoder],
  );

  useEffect(() => {
    if (!open) return;
    const box = scroller.current;
    if (!box) return;
    const target = activeFlagId
      ? box.querySelector<HTMLElement>(`[data-flag-id="${CSS.escape(activeFlagId)}"]`)
      : activePhrase
        ? box.querySelector<HTMLElement>(`[data-phrase="${CSS.escape(activePhrase)}"]`)
        : null;
    if (!target) return;
    box.scrollTop = target.offsetTop - box.clientHeight / 3;
  }, [open, activeFlagId, activePhrase, segments]);

  return (
    <section aria-label="The hold" className="panel flex min-h-0 flex-col p-3">
      <h2 className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="flex items-center gap-2 font-terminal text-[18px] leading-none text-amber">
          <ScrollText aria-hidden className="size-4" strokeWidth={1.75} />
          The hold
          <span className="text-amber-dim">
            {text.length > 0 ? `${text.length.toLocaleString("en-US")} chars` : "empty"}
          </span>
        </span>
        <button
          type="button"
          aria-expanded={open}
          disabled={text.length === 0}
          onClick={onToggle}
          className="rounded-[3px] border border-rope px-2.5 py-1 text-[13px] text-parchment hover:border-amber disabled:opacity-50"
        >
          {open ? "Close the hold" : "Open the hold"}
        </button>
      </h2>

      {note ? <p className="mt-2 text-[13px] text-amber-dim">{note}</p> : null}

      {open && text.length > 0 ? (
        <div
          ref={scroller}
          tabIndex={0}
          role="region"
          aria-label="Policy text"
          className="mt-3 max-h-[30vh] min-h-0 lg:max-h-[20vh] overflow-y-auto border border-rope bg-ink-3 p-3"
        >
          <p className="max-w-[74ch] text-[14px] leading-[1.7] whitespace-pre-wrap text-amber-dim">
            {segments.map((segment, index) => {
              if (!segment.range) return <span key={index}>{segment.text}</span>;
              if (segment.range.kind === "flag") {
                return (
                  <mark
                    key={index}
                    className="hoisted"
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
                  style={
                    segment.range.phrase === activePhrase
                      ? { backgroundColor: "color-mix(in srgb, var(--color-gold) 30%, transparent)" }
                      : undefined
                  }
                >
                  {segment.text}
                </span>
              );
            })}
          </p>
        </div>
      ) : null}
    </section>
  );
}
