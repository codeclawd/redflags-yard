"use client";

import { useReducedMotion } from "motion/react";
import { Share2, ShieldAlert, Telescope } from "lucide-react";
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
  error,
  openFlagId,
  onToggleFlag,
  onShare,
}: {
  phase: "empty" | "scanning" | "results" | "error";
  log: string[];
  result: ScanResult | null;
  error: { message: string; recovery: string } | null;
  openFlagId: string | null;
  onToggleFlag: (flag: Flag) => void;
  onShare: () => void;
}) {
  const reduced = useReducedMotion();
  const { shown, done } = useTypewriter(log, reduced === true || phase === "empty");

  return (
    <section
      aria-label="Deck"
      className="panel scanlines relative flex min-h-0 flex-col gap-4 overflow-y-auto p-4"
    >
      {phase === "empty" ? (
        <div className="flex min-h-[320px] flex-col justify-center gap-3 py-8">
          <h2 className="max-w-[24ch] font-display text-[40px] leading-[0.95] tracking-[-0.01em] text-parchment text-balance">
            Board a privacy policy. Take back what it takes.
          </h2>
          <p className="max-w-[62ch] text-[15px] text-amber-dim">
            Every flag below is a sentence we found in the document, quoted exactly, with the
            offset it sits at. No paraphrase, no invention. Pick a ship from the harbor and press
            Board.
          </p>
          <p className="flex items-center gap-2 font-terminal text-[18px] leading-none text-foam">
            <Telescope aria-hidden className="size-4" strokeWidth={1.75} />
            Awaiting orders.
          </p>
        </div>
      ) : null}

      {phase !== "empty" ? (
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
      ) : null}

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
          <Plunder score={result.score} still={reduced === true} />

          {result.meta.llm !== "ran" ? (
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
            still={reduced === true}
            onToggle={onToggleFlag}
          />
        </>
      ) : null}
    </section>
  );
}
