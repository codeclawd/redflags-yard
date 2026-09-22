"use client";

import { useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import type { ScanScore } from "@/lib/types";

export function Plunder({
  score,
  still,
  provenance,
}: {
  score: ScanScore;
  still: boolean;
  /** Quiet line of origin, e.g. "cached scan · 2026-09-22". */
  provenance: string | null;
}) {
  const reduced = useReducedMotion();
  const instant = still || reduced === true;
  const [animated, setAnimated] = useState(0);
  const shown = instant ? score.value : animated;

  useEffect(() => {
    if (instant) return;
    const controls = animate(0, score.value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => setAnimated(Math.round(value)),
      onComplete: () => setAnimated(score.value),
    });
    return () => controls.stop();
  }, [score.value, instant]);

  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3 border-b border-rope pb-4">
      <p className="flex items-baseline gap-2">
        <span
          className="font-display text-[64px] leading-[0.85] tracking-[-0.01em] tabular-nums text-amber"
          aria-label={`Plunder ${score.value} out of 100`}
        >
          {shown}
        </span>
        <span className="font-terminal text-[22px] leading-none text-amber-dim">
          /100 · grade {score.grade}
        </span>
      </p>

      <motion.p
        initial={instant ? false : { y: -14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.34, 1.4, 0.64, 1], delay: instant ? 0 : 0.55 }}
        className="font-display text-[28px] leading-none tracking-[-0.01em] text-parchment"
      >
        {score.rank}
      </motion.p>

      <p className="flex w-full flex-wrap items-baseline gap-x-2 text-[13px] text-amber-dim">
        <span>Plunder — how much of you they are allowed to take.</span>
        {provenance ? (
          <span className="font-terminal text-[18px] leading-none text-foam">{provenance}</span>
        ) : null}
      </p>
    </div>
  );
}
