"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { CategoryId } from "@/lib/types";
import type { FleetMatrix } from "./types";
import { SEVERITY_COLOR } from "./severity";

/** Two short lines per column — the habit in the reader's words, not the schema's. */
const COLUMN_LABEL: Record<string, [string, string]> = {
  biometric_sensitive: ["your face", "and voice"],
  ai_training: ["trains AI", "on you"],
  cross_site_tracking: ["follows you", "elsewhere"],
  precise_location: ["where", "you are"],
  contacts_harvest: ["your", "contacts"],
  human_review: ["staff read", "your stuff"],
  no_deletion: ["kept after", "you delete"],
  business_transfer: ["sold with", "the company"],
};

const ROW =
  "grid grid-cols-[112px_60px_repeat(8,84px)] items-center lg:grid-cols-[minmax(132px,1fr)_84px_repeat(8,minmax(0,100px))]";

// Below lg the eight columns scroll sideways under the app and its score, which stay put.
const PIN = "sticky z-10 flex self-stretch items-center lg:static lg:bg-transparent";
const PIN_NAME = `${PIN} left-0`;
const PIN_SCORE = `${PIN} left-[112px] shadow-[1px_0_0_var(--color-rope)] lg:shadow-none`;
// A row's pinned cells also cover the row's padding, so nothing shows through above or below.
const PIN_ROW = "-my-2 py-2";

/** A small red flag: the rulebook found at least one clause in this column. */
function Found({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 16 11" className="h-[11px] w-4" aria-hidden>
      <rect x="0" y="0" width="1.7" height="11" fill="var(--color-rope)" />
      <path d="M2.6 0.6h12.4l-3.2 3.5 3.2 3.5H2.6z" fill={color} />
    </svg>
  );
}

export function FleetMatrix({
  matrix,
  activeId,
  busy,
  onBoard,
}: {
  matrix: FleetMatrix;
  activeId: string | null;
  busy: boolean;
  onBoard: (id: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  // Whether the columns overflow the screen, and whether any are still out of view to the right.
  const [edge, setEdge] = useState({ overflow: false, more: false });

  const measure = () => {
    const box = scroller.current;
    if (!box) return;
    const overflow = box.scrollWidth > box.clientWidth + 1;
    const more = overflow && box.scrollLeft + box.clientWidth < box.scrollWidth - 4;
    setEdge((now) => (now.overflow === overflow && now.more === more ? now : { overflow, more }));
  };

  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const scanned = new Date(`${matrix.bakedAt}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <section aria-labelledby="compare-heading" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2
          id="compare-heading"
          className="font-display text-[40px] leading-none tracking-[-0.01em] text-parchment"
        >
          Compare 8 apps
        </h2>
        <p className="max-w-[70ch] text-[15px] text-amber-dim">
          What each policy lets them take, worst first. Click a row to scan it live.
        </p>
      </div>

      {edge.overflow ? (
        <p className="flex items-center gap-1.5 text-[13px] text-amber">
          Swipe sideways for all {matrix.columns.length} columns
          <ArrowRight aria-hidden className="size-3.5" strokeWidth={2} />
        </p>
      ) : null}

      <div className="relative">
        <div ref={scroller} onScroll={measure} className="overflow-x-auto">
          <div className="w-max lg:w-full lg:min-w-[860px]">
            <div className={`${ROW} border-b border-rope pb-2`}>
              <span className={`${PIN_NAME} bg-ink pl-2 text-[13px] text-amber-dim`}>App</span>
              <span className={`${PIN_SCORE} bg-ink text-[13px] text-amber-dim`}>Score</span>
              {matrix.columns.map((column) => {
                const [top, bottom] = COLUMN_LABEL[column.id] ?? [column.id, ""];
                return (
                  <span key={column.id} className="flex flex-col items-center gap-1.5">
                    <span
                      className="block h-[2px] w-7"
                      style={{ backgroundColor: SEVERITY_COLOR[column.severity] }}
                    />
                    <span className="text-center text-[13px] leading-[1.2] text-parchment">
                      {top}
                      <br />
                      {bottom}
                    </span>
                  </span>
                );
              })}
            </div>

            <ul className="divide-y divide-rope/60">
              {matrix.ships.map((ship) => {
                const active = ship.id === activeId;
                const found = matrix.columns.filter((c) => (ship.counts[c.id] ?? 0) > 0).length;
                return (
                  <li key={ship.id}>
                    <button
                      type="button"
                      disabled={busy}
                      aria-current={active ? "true" : undefined}
                      onClick={() => onBoard(ship.id)}
                      aria-label={`Scan ${ship.name}: score ${ship.score.value} of 100, grade ${ship.score.grade}, ${ship.flagCount} flagged sentences, ${found} of ${matrix.columns.length} columns found`}
                      className={`group ${ROW} w-full py-2 text-left transition-colors disabled:opacity-60 ${
                        active ? "bg-ink-2 shadow-[inset_2px_0_0_var(--color-amber)]" : "hover:bg-ink-2"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`${PIN_NAME} ${PIN_ROW} truncate pl-2 text-[15px] text-parchment ${
                          active ? "bg-ink-2 shadow-[inset_2px_0_0_var(--color-amber)]" : "bg-ink group-hover:bg-ink-2"
                        }`}
                      >
                        <span className="min-w-0 truncate">{ship.name}</span>
                      </span>
                      <span
                        aria-hidden
                        className={`${PIN_SCORE} ${PIN_ROW} gap-1.5 ${active ? "bg-ink-2" : "bg-ink group-hover:bg-ink-2"}`}
                      >
                        <span className="text-[15px] font-semibold tabular-nums text-amber">
                          {ship.score.value}
                        </span>
                        <span className="text-[13px] text-amber-dim">{ship.score.grade}</span>
                      </span>
                      {matrix.columns.map((column) => {
                        const count = ship.counts[column.id as CategoryId] ?? 0;
                        return (
                          <span key={column.id} aria-hidden className="flex justify-center">
                            {count > 0 ? (
                              <Found color={SEVERITY_COLOR[column.severity]} />
                            ) : (
                              <span className="block h-px w-3.5 bg-rope" />
                            )}
                          </span>
                        );
                      })}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        {edge.more ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-linear-to-l from-ink to-transparent"
          />
        ) : null}
      </div>

      <p className="max-w-[80ch] text-[13px] leading-snug text-amber-dim">
        A red flag means at least one clause of that kind was found in the policy; a dash means
        none was found in the stored text, which is not a promise. Red columns are the most severe.
        Saved scans from {scanned}. The AI check didn&apos;t run for these, so they come from the
        rules alone.
      </p>
    </section>
  );
}
