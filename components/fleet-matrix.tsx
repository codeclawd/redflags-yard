"use client";

import { ShipWheel } from "lucide-react";
import type { CategoryId } from "@/lib/types";
import type { FleetMatrix } from "./types";
import { SEVERITY_COLOR } from "./severity";

/** Two short lines per column — the habit in the reader's words, not the schema's. */
const COLUMN_LABEL: Record<string, [string, string]> = {
  biometric_sensitive: ["your", "face"],
  ai_training: ["trains", "on you"],
  cross_site_tracking: ["follows", "offsite"],
  precise_location: ["where", "you are"],
  contacts_harvest: ["your", "contacts"],
  human_review: ["humans", "read it"],
  no_deletion: ["kept", "forever"],
  business_transfer: ["sold", "with co."],
};

// Narrow enough on a phone that four pennant columns clear the labels; roomy on a laptop.
const ROW =
  "grid grid-cols-[minmax(96px,1fr)_52px_repeat(8,minmax(0,70px))_92px] items-center lg:grid-cols-[minmax(132px,1fr)_66px_repeat(8,minmax(0,92px))_104px]";

/** A hoisted pennant. Filled = the rulebook found at least one clause here. */
function Pennant({ color }: { color: string }) {
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
  return (
    <section aria-label="Fleet ledger" className="panel order-2 flex shrink-0 flex-col gap-1.5 p-3 lg:order-none lg:col-span-3">
      <h2 className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="flex items-center gap-2 font-terminal text-[18px] leading-none text-amber">
          <ShipWheel aria-hidden className="size-4" strokeWidth={1.75} />
          Fleet ledger
        </span>
        <span className="font-terminal text-[18px] leading-none text-amber-dim">
          eight policies, already boarded — pick a row to board it live
        </span>
      </h2>

      <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:gap-5">
        <div className="-mx-1 overflow-x-auto px-1 xl:min-w-0 xl:flex-1">
          <div className="w-full min-w-[800px] lg:min-w-[820px] lg:max-w-[1096px]">
            <div className={`${ROW} border-b border-rope pb-1`}>
              <span className="sticky left-0 z-10 bg-ink-2 pl-2 font-terminal text-[18px] leading-none text-amber-dim">
                ship
              </span>
              <span className="font-terminal text-[18px] leading-none text-amber-dim">plunder</span>
              {matrix.columns.map((column) => {
                const [top, bottom] = COLUMN_LABEL[column.id] ?? [column.id, ""];
                return (
                  <span key={column.id} className="flex flex-col items-center gap-1">
                    <span
                      className="block h-[2px] w-7"
                      style={{ backgroundColor: SEVERITY_COLOR[column.severity] }}
                    />
                    <span className="text-center font-terminal text-[18px] leading-[0.9] text-parchment">
                      {top}
                      <br />
                      {bottom}
                    </span>
                  </span>
                );
              })}
              <span className="text-right font-terminal text-[18px] leading-none text-amber-dim">
                rank
              </span>
            </div>

            <ul className="divide-y divide-rope/50">
              {matrix.ships.map((ship) => {
                const active = ship.id === activeId;
                const hoisted = matrix.columns.filter((c) => (ship.counts[c.id] ?? 0) > 0).length;
                return (
                  <li key={ship.id}>
                    <button
                      type="button"
                      disabled={busy}
                      aria-current={active ? "true" : undefined}
                      onClick={() => onBoard(ship.id)}
                      aria-label={`Board ${ship.name} — plunder ${ship.score.value} of 100, grade ${ship.score.grade}, ${ship.score.rank}, ${ship.flagCount} flags, ${hoisted} of ${matrix.columns.length} columns hoisted`}
                      className={`${ROW} w-full py-[3px] text-left transition-colors disabled:opacity-60 ${
                        active
                          ? "bg-ink-3 shadow-[inset_2px_0_0_var(--color-amber)]"
                          : "hover:bg-ink-3/60"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`sticky left-0 z-10 truncate pl-2 text-[14px] leading-[18px] text-parchment ${
                          active ? "bg-ink-3" : "bg-ink-2"
                        }`}
                      >
                        {ship.name}
                      </span>
                      <span aria-hidden className="flex items-baseline gap-1">
                        <span className="font-terminal text-[19px] leading-none tabular-nums text-amber">
                          {ship.score.value}
                        </span>
                        <span className="text-[13px] leading-none text-amber-dim">
                          {ship.score.grade}
                        </span>
                      </span>
                      {matrix.columns.map((column) => {
                        const count = ship.counts[column.id as CategoryId] ?? 0;
                        return (
                          <span key={column.id} aria-hidden className="flex justify-center">
                            {count > 0 ? (
                              <Pennant color={SEVERITY_COLOR[column.severity]} />
                            ) : (
                              <span className="block h-px w-3.5 bg-rope" />
                            )}
                          </span>
                        );
                      })}
                      <span
                        aria-hidden
                        className="truncate text-right text-[13px] leading-[18px] text-amber-dim"
                      >
                        {ship.score.rank}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <p className="text-[13px] leading-snug text-amber-dim xl:w-[252px] xl:shrink-0">
          A pennant is at least one clause found in that column — one clause and nine look the same
          here. An empty cell is none found in the stored text, which is not a promise. Red columns
          are critical habits, orange are heavy ones. Cached {matrix.bakedAt} · {matrix.engine}.
        </p>
      </div>
    </section>
  );
}
