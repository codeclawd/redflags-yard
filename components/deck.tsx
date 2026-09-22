"use client";

import { useReducedMotion } from "motion/react";
import { Share2, ShieldAlert } from "lucide-react";
import type { Flag, ScanMeta, ScanResult } from "@/lib/types";
import { FlagList } from "./flag-list";
import { Plunder } from "./plunder";
import { useTypewriter } from "./use-typewriter";

const PARLEY_REASON: Record<Exclude<ScanMeta["llm"], "ran">, string> = {
  "skipped:no-key": "no key on this deployment",
  "skipped:test": "test run",
  "skipped:timeout": "it ran out of time",
  "skipped:rate-limit": "rate-limited",
  "skipped:error": "it errored",
};

export function Deck({
  phase,
  log,
  result,
  cached,
  error,
  openFlagId,
  onToggleFlag,
  onShare,
}: {
  phase: "scanning" | "results" | "error";
  log: string[];
  result: ScanResult | null;
  /** Bake date while this is the committed cached result; null once a live scan replaces it. */
  cached: string | null;
  error: { message: string; recovery: string } | null;
  openFlagId: string | null;
  onToggleFlag: (flag: Flag) => void;
  onShare: () => void;
}) {
  const reduced = useReducedMotion();
  // The cached boarding is already over, so it arrives whole — no typing, no
  // count-up, no stagger. Only a live boarding is animated.
  const instant = cached !== null || reduced === true;
  const { shown, done } = useTypewriter(log, instant);

  return (
    <section
      aria-label="Deck"
      className="panel scanlines relative order-1 flex max-h-[78dvh] min-h-0 flex-col gap-3 overflow-y-auto p-4 lg:order-none lg:max-h-none"
    >
      <div>
        <pre
          aria-live="polite"
          className="whitespace-pre-wrap font-terminal text-[18px] leading-[1.35] text-foam"
        >
          {shown.join("\n")}
          {!done ? <span className="ml-0.5 inline-block bg-foam text-ink">█</span> : null}
        </pre>
        {phase === "scanning" ? (
          <div
            role="progressbar"
            aria-label="Boarding"
            className="barricade mt-3 h-2.5 rounded-[2px] border border-rope"
          />
        ) : null}
      </div>

      {phase === "error" && error ? (
        <div className="border border-blood bg-ink-3 p-3.5">
          <h3 className="flex items-center gap-2 text-[15px] text-parchment">
            <ShieldAlert aria-hidden className="size-4 text-blood" strokeWidth={2} />
            {error.message}
          </h3>
          <p className="mt-1.5 max-w-[62ch] text-[14px] text-amber-dim">{error.recovery}</p>
        </div>
      ) : null}

      {phase === "results" && result ? (
        <>
          <Plunder
            score={result.score}
            still={instant}
            provenance={cached ? `cached scan · ${cached} · rules only, no parley` : null}
          />

          {!cached && result.meta.llm !== "ran" ? (
            <p className="border border-rope bg-ink-3 px-3 py-2 text-[13px] text-amber-dim">
              Parley skipped ({PARLEY_REASON[result.meta.llm]}) — these flags are from the rulebook
              alone.
            </p>
          ) : null}

          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="font-terminal text-[22px] leading-none text-amber">
              {result.flags.length} flag{result.flags.length === 1 ? "" : "s"} hoisted
            </h3>
            <button
              type="button"
              onClick={onShare}
              className="flex items-center gap-1.5 rounded-[3px] border border-rope px-2.5 py-1.5 text-[13px] text-parchment hover:border-amber"
            >
              <Share2 aria-hidden className="size-3.5" strokeWidth={1.75} />
              Copy the report
            </button>
          </div>

          <FlagList
            flags={result.flags}
            openId={openFlagId}
            still={instant}
            onToggle={onToggleFlag}
          />
        </>
      ) : null}
    </section>
  );
}
