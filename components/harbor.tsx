"use client";

import { Anchor, Ship, Telescope } from "lucide-react";
import type { FleetShip } from "./types";

export function Harbor({
  selected,
  pasted,
  url,
  busy,
  onPaste,
  onUrl,
  onBoard,
}: {
  /** The ship picked in the fleet ledger, if any. */
  selected: FleetShip | null;
  pasted: string;
  url: string;
  busy: boolean;
  onPaste: (value: string) => void;
  onUrl: (value: string) => void;
  onBoard: () => void;
}) {
  const canBoard = Boolean(selected) || pasted.trim().length > 0 || url.trim().length > 0;

  return (
    <section
      aria-label="Harbor"
      className="panel order-3 flex min-h-0 flex-col gap-3 p-3 lg:order-none lg:overflow-hidden"
    >
      <h2 className="flex items-center gap-2 font-terminal text-[18px] leading-none text-amber">
        <Ship aria-hidden className="size-4" strokeWidth={1.75} />
        Harbor
      </h2>

      <div aria-live="polite" className="shrink-0 border border-rope bg-ink-3 px-2.5 py-2">
        {selected ? (
          <>
            <span className="block truncate text-[15px] text-parchment">{selected.name}</span>
            <span className="mt-0.5 block font-terminal text-[18px] leading-none text-amber-dim tabular-nums">
              {selected.chars.toLocaleString("en-US")} chars · at anchor
            </span>
          </>
        ) : (
          <span className="block text-[14px] leading-snug text-amber-dim">
            No ship picked. Choose a row in the fleet ledger, or bring your own below.
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-col gap-1.5 lg:flex-1">
        <label htmlFor="paste" className="shrink-0 text-[13px] text-amber-dim">
          Paste a policy
        </label>
        <textarea
          id="paste"
          value={pasted}
          disabled={busy}
          rows={3}
          onChange={(event) => onPaste(event.target.value)}
          placeholder="Paste the whole policy text here."
          className="w-full min-h-0 resize-none rounded-[3px] border border-rope bg-ink-3 px-2.5 py-2 text-[14px] text-parchment disabled:opacity-50 lg:flex-1"
        />
      </div>

      <div className="shrink-0 space-y-1.5">
        <label htmlFor="url" className="block text-[13px] text-amber-dim">
          Hail a URL
        </label>
        <input
          id="url"
          type="url"
          value={url}
          disabled={busy}
          inputMode="url"
          onChange={(event) => onUrl(event.target.value)}
          placeholder="https://example.com/privacy"
          className="w-full rounded-[3px] border border-rope bg-ink-3 px-2.5 py-2 text-[14px] text-parchment disabled:opacity-50"
        />
      </div>

      <button
        type="button"
        disabled={busy || !canBoard}
        onClick={onBoard}
        className="mt-1 flex shrink-0 items-center justify-center gap-2 rounded-[3px] border border-amber bg-amber px-3 py-2.5 text-[15px] font-semibold text-ink transition-colors hover:bg-gold disabled:cursor-not-allowed disabled:border-rope disabled:bg-ink-3 disabled:text-amber-dim"
      >
        {busy ? (
          <Telescope aria-hidden className="size-4" strokeWidth={2} />
        ) : (
          <Anchor aria-hidden className="size-4" strokeWidth={2} />
        )}
        {busy ? "Boarding…" : selected ? `Board ${selected.name}` : "Board"}
      </button>
    </section>
  );
}
