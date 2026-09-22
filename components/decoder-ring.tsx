"use client";

import { KeyRound } from "lucide-react";
import type { DecodedPhrase } from "@/lib/types";
import { SEVERITY_COLOR } from "./severity";

export function DecoderRing({
  decoder,
  activePhrase,
  onSelect,
}: {
  decoder: DecodedPhrase[];
  activePhrase: string | null;
  onSelect: (phrase: string) => void;
}) {
  return (
    <section
      aria-label="Decoder ring"
      className="panel order-4 flex max-h-[60dvh] min-h-0 flex-col gap-3 overflow-y-auto p-3 lg:order-none lg:max-h-none"
    >
      <h2 className="flex items-center gap-2 font-terminal text-[18px] leading-none text-amber">
        <KeyRound aria-hidden className="size-4" strokeWidth={1.75} />
        Decoder ring
      </h2>

      {decoder.length === 0 ? (
        <p className="text-[13px] text-amber-dim">
          Words that sound harmless land here once a policy is aboard.
        </p>
      ) : (
        <ul className="divide-y divide-rope">
          {decoder.map((entry) => {
            const active = entry.phrase === activePhrase;
            return (
              <li key={entry.phrase}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(entry.phrase)}
                  className={`w-full py-2.5 text-left ${active ? "bg-ink-3" : "hover:bg-ink-3/50"}`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span
                      className="text-[14px] text-parchment"
                      style={{ textDecoration: "underline dotted", textUnderlineOffset: "3px" }}
                    >
                      {entry.phrase}
                    </span>
                    <span
                      className="shrink-0 text-[13px] leading-none tabular-nums"
                      style={{ color: SEVERITY_COLOR[entry.severity] }}
                    >
                      ×{entry.count}
                    </span>
                  </span>
                  <span className="mt-1 block text-[13px] leading-snug text-amber-dim">
                    {entry.meaning}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
