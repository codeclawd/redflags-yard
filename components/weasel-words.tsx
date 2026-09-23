"use client";

import type { DecodedPhrase } from "@/lib/types";

export function WeaselWords({
  decoder,
  activePhrase,
  onSelect,
}: {
  decoder: DecodedPhrase[];
  activePhrase: string | null;
  onSelect: (phrase: string) => void;
}) {
  return (
    <section aria-labelledby="weasel-heading" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2
          id="weasel-heading"
          className="font-display text-[40px] leading-none tracking-[-0.01em] text-parchment"
        >
          Weasel words
        </h2>
        <p className="max-w-[60ch] text-[15px] text-amber-dim">
          Words that sound normal but hide what they let the company do.
        </p>
      </div>

      {decoder.length === 0 ? (
        <p className="py-2 text-[15px] text-foam">None found in this policy.</p>
      ) : (
        <ul className="divide-y divide-rope border-y border-rope">
          {decoder.map((entry) => {
            const active = entry.phrase === activePhrase;
            return (
              <li key={entry.phrase}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(entry.phrase)}
                  className={`grid w-full gap-x-4 gap-y-1 px-2 py-3 text-left transition-colors sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto] ${
                    active ? "bg-ink-2" : "hover:bg-ink-2"
                  }`}
                >
                  <span className="text-[15px] text-parchment">
                    <span className="decoded">{entry.phrase}</span>
                  </span>
                  <span className="text-[14px] leading-snug text-parchment/80">{entry.meaning}</span>
                  <span className="text-[13px] leading-snug whitespace-nowrap tabular-nums text-amber">
                    {entry.count} {entry.count === 1 ? "time" : "times"}
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
