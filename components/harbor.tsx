"use client";

import { Anchor, Ship, Telescope } from "lucide-react";
import type { FleetShip } from "./types";

export function Harbor({
  fleet,
  selectedId,
  pasted,
  url,
  busy,
  onPick,
  onPaste,
  onUrl,
  onBoard,
}: {
  fleet: FleetShip[];
  selectedId: string | null;
  pasted: string;
  url: string;
  busy: boolean;
  onPick: (id: string) => void;
  onPaste: (value: string) => void;
  onUrl: (value: string) => void;
  onBoard: () => void;
}) {
  const canBoard = Boolean(selectedId) || pasted.trim().length > 0 || url.trim().length > 0;

  return (
    <section
      aria-label="Harbor"
      className="panel flex min-h-0 flex-col gap-3 p-3 lg:overflow-hidden"
    >
      <h2 className="flex items-center gap-2 font-terminal text-[18px] leading-none text-amber">
        <Ship aria-hidden className="size-4" strokeWidth={1.75} />
        Harbor
      </h2>

      <div className="flex min-h-0 flex-col lg:flex-1">
        <p id="fleet-hint" className="mb-2 text-[13px] text-amber-dim">
          Eight ships already at anchor. Pick one, or bring your own below.
        </p>
        <ul
          aria-describedby="fleet-hint"
          className="snap-row -mx-1 flex min-h-0 gap-2 overflow-x-auto px-1 pb-2 lg:grid lg:grid-cols-2 lg:content-start lg:overflow-y-auto lg:pb-0"
        >
          {fleet.map((ship) => {
            const active = ship.id === selectedId;
            return (
              <li key={ship.id} className="w-[148px] shrink-0 lg:w-auto">
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={active}
                  onClick={() => onPick(ship.id)}
                  className={`h-full w-full rounded-[3px] border px-2.5 py-2 text-left transition-colors disabled:opacity-50 ${
                    active
                      ? "border-amber bg-ink-3 text-parchment"
                      : "border-rope bg-ink-3/40 text-parchment hover:border-amber-dim"
                  }`}
                >
                  <span className="block truncate text-[14px]">{ship.name}</span>
                  <span className="mt-0.5 block font-terminal text-[18px] leading-none text-amber-dim tabular-nums">
                    {ship.chars.toLocaleString("en-US")} chars
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="shrink-0 space-y-1.5">
        <label htmlFor="paste" className="block text-[13px] text-amber-dim">
          Paste a policy
        </label>
        <textarea
          id="paste"
          value={pasted}
          disabled={busy}
          rows={3}
          onChange={(event) => onPaste(event.target.value)}
          placeholder="Paste the whole policy text here."
          className="w-full resize-y rounded-[3px] border border-rope bg-ink-3 px-2.5 py-2 text-[14px] text-parchment disabled:opacity-50"
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
        {busy ? "Boarding…" : "Board"}
      </button>
    </section>
  );
}
