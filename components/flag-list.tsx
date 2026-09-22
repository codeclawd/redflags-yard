"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Flag } from "@/lib/types";
import { CATEGORY_ICON, CATEGORY_LABEL, SEVERITY_COLOR, SEVERITY_LABEL } from "./severity";
import { JollyRouge } from "./jolly-rouge";

export function FlagList({
  flags,
  openId,
  still,
  onToggle,
}: {
  flags: Flag[];
  openId: string | null;
  still: boolean;
  onToggle: (flag: Flag) => void;
}) {
  const reduced = useReducedMotion();
  const instant = still || reduced === true;
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!openId) return;
    const row = list.current?.querySelector<HTMLElement>(`[data-flag-row="${CSS.escape(openId)}"]`);
    row?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [openId, reduced]);

  if (flags.length === 0) {
    return (
      <p className="py-6 text-[14px] text-foam">
        No flags hoisted. Nothing in this policy tripped the rulebook — read the hold yourself
        before you trust that.
      </p>
    );
  }

  return (
    <ul ref={list} className="divide-y divide-rope">
      {flags.map((flag, index) => {
        const Icon = CATEGORY_ICON[flag.category];
        const open = openId === flag.id;
        const color = SEVERITY_COLOR[flag.severity];

        return (
          <motion.li
            key={flag.id}
            data-flag-row={flag.id}
            initial={instant ? false : { y: 12, clipPath: "inset(0 0 100% 0)" }}
            animate={{ y: 0, clipPath: "inset(0 0 0% 0)" }}
            transition={{
              duration: 0.34,
              ease: [0.16, 1, 0.3, 1],
              delay: instant ? 0 : index * 0.06,
            }}
          >
            <h4>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => onToggle(flag)}
                className="flex w-full items-start gap-3 py-3 text-left hover:bg-ink-3/50"
              >
                <span
                  aria-hidden
                  className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[3px] border"
                  style={{ borderColor: color, color }}
                >
                  {flag.severity === "critical" ? (
                    <JollyRouge className="h-4 w-auto" />
                  ) : (
                    <Icon className="size-4" strokeWidth={1.75} />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] leading-snug text-parchment text-balance">
                    {flag.headline}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] leading-none">
                    <span style={{ color }}>{SEVERITY_LABEL[flag.severity]}</span>
                    <span className="text-rope">·</span>
                    <span className="text-amber-dim">{CATEGORY_LABEL[flag.category]}</span>
                    {flag.source === "llm" ? (
                      <>
                        <span className="text-rope">·</span>
                        <span className="text-foam">parley</span>
                      </>
                    ) : null}
                  </span>
                </span>

                <span className="mt-1 shrink-0 font-terminal text-[18px] leading-none text-amber">
                  {open ? "[−]" : "[+]"}
                </span>
              </button>
            </h4>

            {open ? (
              <div className="pb-4 pl-10">
                <p className="mb-3 max-w-[68ch] text-[14px] text-amber-dim">{flag.plainEnglish}</p>
                <blockquote className="parchment max-w-[68ch] px-3.5 py-3">
                  <p className="text-[15px] leading-[1.6] text-quill">“{flag.quote}”</p>
                  <footer className="mt-2 text-[13px] text-quill-dim">
                    Verbatim, characters {flag.start.toLocaleString("en-US")}–
                    {flag.end.toLocaleString("en-US")} of the policy.
                  </footer>
                </blockquote>
                {flag.decoded ? (
                  <p className="mt-3 max-w-[68ch] text-[13px] text-amber-dim">
                    <span className="decoded">{flag.decoded.phrase}</span> — {flag.decoded.meaning}
                  </p>
                ) : null}
              </div>
            ) : null}
          </motion.li>
        );
      })}
    </ul>
  );
}
