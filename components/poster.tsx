"use client";

import { useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import type { CategoryId, Rank, ScanResult } from "@/lib/types";
import { JollyRouge } from "./jolly-rouge";
import { topCharges } from "./severity";

/**
 * A torn, slightly uneven sheet edge. Seeded, so the server and the client
 * draw the same outline and hydration never disagrees.
 */
const DECKLE = (() => {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const steps = 36;
  const jitter = (depth: number) => (rand() * depth).toFixed(2);
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) points.push(`${((i / steps) * 100).toFixed(2)}% ${jitter(0.7)}%`);
  for (let i = 1; i <= steps; i++) points.push(`${(100 - Number(jitter(0.9))).toFixed(2)}% ${((i / steps) * 100).toFixed(2)}%`);
  for (let i = steps - 1; i >= 0; i--) points.push(`${((i / steps) * 100).toFixed(2)}% ${(100 - Number(jitter(0.7))).toFixed(2)}%`);
  for (let i = steps - 1; i >= 1; i--) points.push(`${jitter(0.9)}% ${((i / steps) * 100).toFixed(2)}%`);
  return `polygon(${points.join(", ")})`;
})();

const EASE = [0.16, 1, 0.3, 1] as const;

/** The five ranks, best to worst, and where each sits, in words. */
const RANKS: Rank[] = ["Honest merchant", "Smuggler", "Privateer", "Pirate", "Ghost ship"];
const PLACE = [
  "the best of five ranks",
  "second best of five ranks",
  "the middle of five ranks",
  "second worst of five ranks",
  "the worst of five ranks",
];

export function Poster({
  result,
  name,
  still,
  onCharge,
}: {
  result: ScanResult;
  /** Who the poster is for: an app name, a host name, or "The pasted policy". */
  name: string;
  /** The cached first paint is history: it arrives whole, with no assembly. */
  still: boolean;
  /** A charge line was clicked: show its evidence. */
  onCharge: (category: CategoryId) => void;
}) {
  const reduced = useReducedMotion();
  const instant = still || reduced === true;
  const wanted = result.flags.length > 0;
  const charges = topCharges(result.flags);
  const { value, grade, rank } = result.score;
  const place = RANKS.indexOf(rank);

  const [counted, setCounted] = useState(0);
  const shown = instant ? value : counted;

  // The number counts up and lands exactly on the score on its last frame.
  useEffect(() => {
    if (instant) return;
    const controls = animate(0, value, {
      duration: 0.9,
      delay: 0.35,
      ease: EASE,
      onUpdate: (v) => setCounted(Math.round(v)),
      onComplete: () => setCounted(value),
    });
    return () => controls.stop();
  }, [value, instant]);

  // With `initial: false` motion renders the resting state at once, so the
  // cached poster and a reduced-motion visitor get the same frame, unmoved.
  const enter = (delay: number, from: Record<string, number | string>, to = {}) => ({
    initial: instant ? (false as const) : from,
    animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", ...to },
    transition: { duration: 0.5, ease: EASE, delay: instant ? 0 : delay },
  });

  return (
    <div className="poster-shadow @container w-full">
      <article
        aria-label={wanted ? `Wanted poster for ${name}` : `No bounty for ${name}`}
        className="poster relative flex flex-col items-center px-[7cqw] pt-[5cqw] pb-[6cqw] text-center text-quill"
        style={{ clipPath: DECKLE }}
      >
        <PaperGrain />
        <span aria-hidden className="tack left-[5cqw]" />
        <span aria-hidden className="tack right-[5cqw]" />

        {wanted ? (
          <motion.div
            className="relative"
            {...enter(0.05, { opacity: 0, scale: 1.6, rotate: -14 }, { rotate: -3 })}
          >
            <JollyRouge className="h-[min(15cqw,11dvh)] w-auto" title="Skull and crossed keys" />
          </motion.div>
        ) : null}

        <h1 className="relative mt-[2cqw] font-display text-[length:min(21cqw,15dvh)] leading-[0.82] tracking-[-0.01em]">
          {wanted ? "Wanted" : "No bounty"}
        </h1>

        <div aria-hidden className="relative my-[2.4cqw] h-[5px] w-[62%] border-y border-quill" />

        <p
          className={`relative max-w-full font-display first-letter:uppercase leading-[0.95] tracking-[-0.01em] break-words text-balance text-blood ${
            name.length > 12 ? "text-[length:min(9cqw,6.5dvh)]" : "text-[length:min(13cqw,9dvh)]"
          }`}
        >
          {name}
        </p>

        {wanted ? (
          <div className="relative mt-[3cqw]">
            <p className="font-display text-[length:min(6.5cqw,4.4dvh)] leading-none text-quill-dim">
              for taking
            </p>
            <ul className="mt-[1.2cqw] space-y-[0.4cqw]">
              {charges.map(({ category, charge }, index) => (
                <motion.li
                  key={category}
                  className="text-[length:min(4cqw,2.6dvh)] leading-[1.3] font-semibold"
                  {...enter(0.25 + index * 0.08, { opacity: 0, y: 8, filter: "blur(4px)" })}
                >
                  <button
                    type="button"
                    data-charge={category}
                    aria-label={`${charge}: show the evidence`}
                    onClick={() => onCharge(category)}
                    className="cursor-pointer rounded-[2px] font-semibold underline decoration-quill/35 decoration-dotted decoration-[0.07em] underline-offset-[0.2em] transition-colors hover:decoration-quill hover:decoration-solid focus-visible:decoration-quill focus-visible:decoration-solid"
                  >
                    {charge}
                  </button>
                </motion.li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="relative mt-[3cqw] max-w-[36ch] text-[length:min(3.6cqw,17px)] leading-[1.45] font-medium">
            Nothing in this policy tripped the rulebook. Read it yourself before you trust that.
          </p>
        )}

        <div aria-hidden className="relative mt-[3.4cqw] h-px w-[78%] bg-quill/40" />

        <div className="relative mt-[2.6cqw] flex items-center justify-center gap-[5cqw]">
          <p
            aria-label={`Risk score ${value} out of 100`}
            className="flex items-baseline font-display leading-none tabular-nums"
          >
            <span className="text-[length:min(18cqw,12dvh)] tracking-[-0.02em]">{shown}</span>
            <span className="ml-[1cqw] text-[length:min(6cqw,4dvh)] text-quill-dim">/100</span>
          </p>
          <motion.p
            aria-label={`Grade ${grade}`}
            className={`stamp grid size-[min(17cqw,11.5dvh)] place-items-center rounded-full font-display text-[length:min(11cqw,7.5dvh)] leading-none ${
              wanted ? "text-blood" : "text-quill"
            }`}
            {...enter(1.2, { opacity: 0, scale: 1.8, rotate: 24 }, { rotate: 8 })}
          >
            {grade}
          </motion.p>
        </div>

        <p className="relative mt-[1.6cqw] text-[length:min(2.8cqw,14px)] leading-snug text-quill-dim">
          Risk score out of 100 · higher is worse for you
        </p>
        <p className="relative mt-[0.8cqw] flex items-center gap-[1.4cqw] text-[length:min(2.8cqw,14px)] leading-snug text-quill-dim">
          <span aria-hidden className="flex gap-[0.6cqw]">
            {RANKS.map((step, index) => (
              <span
                key={step}
                className={`block size-[min(1.7cqw,9px)] border border-quill ${
                  index === place ? (wanted ? "bg-blood" : "bg-quill") : "opacity-45"
                }`}
              />
            ))}
          </span>
          <span>
            Rank: <span className="font-semibold text-quill">{rank}</span>, {PLACE[place]}
          </span>
        </p>
      </article>
    </div>
  );
}

/** Aged paper: fine grain plus long fibres, multiplied into the parchment. */
function PaperGrain() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full mix-blend-multiply">
      <filter id="paper-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0.42  0 0 0 0 0.34  0 0 0 0 0.23  0.55 0 0 0 -0.18"
        />
      </filter>
      <filter id="paper-fibre">
        <feTurbulence type="fractalNoise" baseFrequency="0.02 0.09" numOctaves="3" seed="4" />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0.42  0 0 0 0 0.34  0 0 0 0 0.23  0.28 0 0 0 -0.14"
        />
      </filter>
      <rect width="100%" height="100%" filter="url(#paper-grain)" />
      <rect width="100%" height="100%" filter="url(#paper-fibre)" />
    </svg>
  );
}
