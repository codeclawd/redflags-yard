"use client";

import { useEffect, useState } from "react";
import { JollyRouge } from "./jolly-rouge";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function StatusBar({
  ticker,
  scanCount,
}: {
  ticker: string[];
  scanCount: number;
}) {
  const [clock, setClock] = useState<string | null>(null);

  useEffect(() => {
    const paint = () => {
      const now = new Date();
      setClock(
        `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} UTC`,
      );
    };
    paint();
    const id = setInterval(paint, 1000);
    return () => clearInterval(id);
  }, []);

  const line = ticker.length > 0 ? ticker : ["Pick a ship from the harbor and board it."];

  return (
    <header className="panel flex flex-wrap items-stretch gap-x-4 gap-y-2 px-3 py-2 lg:flex-nowrap">
      <div className="flex shrink-0 items-center gap-2.5">
        <JollyRouge className="h-6 w-auto" title="Red Flags" />
        <span className="font-display text-[28px] leading-none tracking-[-0.01em] text-parchment">
          Red Flags
        </span>
      </div>

      <div className="marquee order-last w-full basis-full self-center border-y border-rope py-1 lg:order-none lg:w-auto lg:min-w-0 lg:flex-1 lg:basis-auto lg:border-x lg:border-y-0 lg:px-4 lg:py-0">
        <span className="font-terminal text-[18px] leading-none text-amber">
          {line.map((item, i) => (
            <span key={i}>
              {item}
              <span className="px-3 text-rope">{"///"}</span>
            </span>
          ))}
        </span>
      </div>

      <dl className="flex shrink-0 items-center gap-4 font-terminal text-[18px] leading-none">
        <div className="flex items-baseline gap-1.5">
          <dt className="text-amber-dim">boardings</dt>
          <dd className="tabular-nums text-amber">{pad(scanCount).padStart(6, "0")}</dd>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt className="sr-only">Time</dt>
          <dd className="tabular-nums text-amber-dim">{clock ?? "--:--:-- UTC"}</dd>
        </div>
      </dl>
    </header>
  );
}
