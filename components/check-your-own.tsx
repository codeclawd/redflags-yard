"use client";

import { ScanSearch } from "lucide-react";
import type { ScanSource } from "./scan-source";
import type { MatrixShip } from "./types";

export type Status =
  | { kind: "idle"; line: string }
  | { kind: "scanning"; name: string }
  | { kind: "error"; message: string; recovery: string };

const FIELD =
  "w-full rounded-[3px] border border-rope bg-ink px-3 py-2.5 text-[15px] text-parchment transition-opacity disabled:opacity-50";

export function CheckYourOwn({
  apps,
  activeId,
  pasted,
  url,
  source,
  status,
  onPaste,
  onUrl,
  onScan,
  onPick,
}: {
  apps: MatrixShip[];
  /** The app currently on the poster, if the poster is one of the eight. */
  activeId: string | null;
  pasted: string;
  url: string;
  /** What the button will scan: the field edited last (see `pickSource`). */
  source: ScanSource | null;
  status: Status;
  onPaste: (value: string) => void;
  onUrl: (value: string) => void;
  onScan: () => void;
  onPick: (id: string) => void;
}) {
  const busy = status.kind === "scanning";
  // Both fields can hold something; only one is scanned. The other dims so the
  // visitor can see which one the button means.
  const pasteIdle = source?.kind === "url" && pasted.trim().length > 0;
  const urlIdle = source?.kind === "paste" && url.trim().length > 0;

  return (
    <section aria-labelledby="check-heading" className="panel flex flex-col gap-4 p-5">
      <h2
        id="check-heading"
        className="font-display text-[34px] leading-none tracking-[-0.01em] text-parchment"
      >
        Check your own
      </h2>

      <div className={`flex flex-col gap-1.5 transition-opacity ${pasteIdle ? "opacity-55" : ""}`}>
        <label htmlFor="paste" className="flex items-baseline justify-between text-[14px] text-parchment">
          Paste a privacy policy
          {pasteIdle ? <span className="text-[13px] text-amber-dim">not used</span> : null}
        </label>
        <textarea
          id="paste"
          value={pasted}
          disabled={busy}
          rows={6}
          onChange={(event) => onPaste(event.target.value)}
          placeholder="Paste the whole policy text here."
          className={`${FIELD} min-h-[132px] resize-y leading-[1.5]`}
        />
      </div>

      <div className={`flex flex-col gap-1.5 transition-opacity ${urlIdle ? "opacity-55" : ""}`}>
        <label htmlFor="url" className="flex items-baseline justify-between text-[14px] text-parchment">
          …or paste a link to one
          {urlIdle ? <span className="text-[13px] text-amber-dim">not used</span> : null}
        </label>
        <input
          id="url"
          type="url"
          value={url}
          disabled={busy}
          inputMode="url"
          onChange={(event) => onUrl(event.target.value)}
          placeholder="https://example.com/privacy"
          className={FIELD}
        />
      </div>

      <button
        type="button"
        disabled={busy || !source}
        onClick={onScan}
        className="flex items-center justify-center gap-2 rounded-[3px] border border-amber bg-amber px-3 py-3 text-[16px] font-semibold text-ink transition-colors hover:bg-gold disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-amber"
      >
        <ScanSearch aria-hidden className="size-[18px]" strokeWidth={2} />
        {busy
          ? "Scanning…"
          : source?.kind === "url"
            ? "Scan the link"
            : source?.kind === "paste"
              ? "Scan the pasted text"
              : "Scan it"}
      </button>

      <div aria-live="polite" className="text-[14px] leading-snug empty:hidden">
        {status.kind === "scanning" ? (
          <div className="flex flex-col gap-2">
            <span className="text-foam">Reading {status.name}…</span>
            <div role="progressbar" aria-label="Scanning" className="barricade h-2 rounded-[2px] border border-rope" />
          </div>
        ) : status.kind === "error" ? (
          <p>
            <span className="text-parchment">{status.message}</span>{" "}
            <span className="text-amber">{status.recovery}</span>
          </p>
        ) : status.line ? (
          <span className="text-amber-dim">{status.line}</span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 border-t border-rope pt-4">
        <p className="text-[14px] text-parchment">Or try one:</p>
        <ul className="flex flex-wrap gap-1.5">
          {apps.map((app) => {
            const active = app.id === activeId;
            return (
              <li key={app.id}>
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={active}
                  aria-label={`Scan ${app.name}`}
                  onClick={() => onPick(app.id)}
                  className={`flex items-baseline gap-1.5 rounded-[3px] border px-2.5 py-1.5 text-[14px] transition-colors disabled:opacity-60 ${
                    active
                      ? "border-amber text-amber"
                      : "border-rope text-parchment hover:border-amber hover:text-amber"
                  }`}
                >
                  {app.name}
                  <span aria-hidden className="text-[13px] text-amber-dim">
                    {app.score.grade}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
