"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Flag, ScanError, ScanErrorCode, ScanResult } from "@/lib/types";
import { Deck } from "@/components/deck";
import { DecoderRing } from "@/components/decoder-ring";
import { FleetMatrix } from "@/components/fleet-matrix";
import { Harbor } from "@/components/harbor";
import { Hold } from "@/components/hold";
import { HowItWorks } from "@/components/how-it-works";
import { ShareReport } from "@/components/share-report";
import { StatusBar } from "@/components/status-bar";
import { mockScan } from "@/components/mock-scan";
import type { FleetMatrix as FleetMatrixData, FleetPolicy } from "@/components/types";
import matrixJson from "@/public/baked/matrix.json";
import bakedJson from "@/public/baked/tiktok.json";

// The first frame is a finished boarding. These two files are committed output
// of the real engine over the real stored policy (`pnpm bake`, rules only, no
// parley), imported rather than fetched so the result is painted, not awaited.
// Pressing Board — here or on a ledger row — runs the live scan and replaces it.
const MATRIX = matrixJson as unknown as FleetMatrixData;
const BAKED = bakedJson as unknown as ScanResult;
const BAKED_ID = "tiktok";
const BAKED_SHIP = MATRIX.ships.find((ship) => ship.id === BAKED_ID) ?? MATRIX.ships[0];
// The cached boarding is history, so it reports as one status line rather than
// replaying five. A live boarding still types the whole log.
const BAKED_LOG = [
  `Boarded ${BAKED_SHIP.name} — ${BAKED.meta.sourceChars.toLocaleString("en-US")} chars searched, no parley, ${BAKED.flags.length} flags hoisted.`,
];

type Phase = "scanning" | "results" | "error";
type Trouble = { message: string; recovery: string };

const TROUBLE: Record<ScanErrorCode, Trouble> = {
  INVALID_INPUT: {
    message: "Nothing to board.",
    recovery: "Pick a ship from the fleet, paste a policy, or hail a URL.",
  },
  FETCH_FAILED: {
    message: "The ship is bot-walled.",
    recovery: "Paste the text or pick one from the fleet.",
  },
  BLOCKED_URL: {
    message: "That address points back inside the harbor.",
    recovery: "Only public http and https addresses can be hailed.",
  },
  NOT_HTML: {
    message: "That address is not a web page.",
    recovery: "Open it yourself, copy the policy, and paste it here.",
  },
  EMPTY_CONTENT: {
    message: "Too little text to search.",
    recovery: "A policy needs at least 200 characters. Paste the whole document.",
  },
  CONTENT_TOO_LARGE: {
    message: "That document is over the 400,000 character cap.",
    recovery: "Paste the privacy policy alone, not the whole terms library.",
  },
  RATE_LIMITED: {
    message: "Too many boardings from this address.",
    recovery: "Wait a minute and press Board again.",
  },
  SCAN_FAILED: {
    message: "The boarding party broke apart mid-search.",
    recovery: "Press Board again. If it keeps happening, paste the text instead.",
  },
};

export default function Page() {
  const [selectedId, setSelectedId] = useState<string | null>(BAKED_ID);
  const [pasted, setPasted] = useState("");
  const [url, setUrl] = useState("");

  const [phase, setPhase] = useState<Phase>("results");
  const [log, setLog] = useState<string[]>(BAKED_LOG);
  const [result, setResult] = useState<ScanResult | null>(BAKED);
  const [cached, setCached] = useState<string | null>(MATRIX.bakedAt);
  const [trouble, setTrouble] = useState<Trouble | null>(null);
  const [shipName, setShipName] = useState(BAKED_SHIP.name);
  const [sourceText, setSourceText] = useState("");
  const [holdNote, setHoldNote] = useState<string | null>(null);

  const [openFlagId, setOpenFlagId] = useState<string | null>(null);
  const [activePhrase, setActivePhrase] = useState<string | null>(null);
  const [holdOpen, setHoldOpen] = useState(false);
  const [overlay, setOverlay] = useState<"none" | "how" | "share">("none");
  const [scanCount, setScanCount] = useState(0);

  // The cached result is complete without it, so the policy text the hold shows
  // is the one thing that arrives after first paint. A boarding that starts
  // first owns `sourceText`, and this drops its late answer on the floor.
  const boarded = useRef(false);
  useEffect(() => {
    let live = true;
    fetch(`/policies/${BAKED_ID}.json`)
      .then((response) => response.json() as Promise<FleetPolicy>)
      .then((policy) => {
        if (live && !boarded.current) setSourceText(policy.text);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const board = useCallback(
    async (overrideId?: string) => {
      const id = overrideId ?? selectedId;
      const ship = MATRIX.ships.find((entry) => entry.id === id) ?? null;
      const usingPaste = !ship && pasted.trim().length > 0;
      const name = ship ? ship.name : usingPaste ? "the pasted policy" : url.trim();
      if (!ship && !usingPaste && url.trim().length === 0) return;

      boarded.current = true;
      setPhase("scanning");
      setResult(null);
      setCached(null);
      setTrouble(null);
      setOpenFlagId(null);
      setActivePhrase(null);
      setShipName(name);
      setSourceText("");
      setHoldNote(null);
      setLog([`Hailing ${name}…`]);

      let text = "";
      try {
        if (ship) {
          const policy = (await fetch(`/policies/${ship.id}.json`).then((r) =>
            r.json(),
          )) as FleetPolicy;
          text = policy.text;
        } else if (usingPaste) {
          text = pasted;
        }
        if (text.length > 0) {
          setSourceText(text);
          setLog((lines) => [
            ...lines,
            `Reading the manifest… ${text.length.toLocaleString("en-US")} chars`,
            "Searching the hold…",
          ]);
        } else {
          setHoldNote(
            "A hailed URL is read on the server, so its text is not aboard. Every flag below still carries its quote.",
          );
          setLog((lines) => [...lines, "Reading the manifest…", "Searching the hold…"]);
        }

        let scan: ScanResult;
        const mock = new URLSearchParams(window.location.search).get("mock") === "1";
        if (mock && text.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 900));
          scan = mockScan(text, ship?.id ?? "pasted");
        } else {
          const body = ship
            ? { policyId: ship.id }
            : usingPaste
              ? { text: pasted }
              : { url: url.trim() };
          const response = await fetch("/api/scan", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          });
          const payload = (await response.json()) as ScanResult | ScanError;
          if (!response.ok || "error" in payload) {
            const code = "code" in payload ? payload.code : "FETCH_FAILED";
            setTrouble(TROUBLE[code] ?? TROUBLE.FETCH_FAILED);
            setLog((lines) => [...lines, "Boarding failed."]);
            setPhase("error");
            return;
          }
          scan = payload;
        }

        setLog((lines) => [
          ...lines,
          scan.meta.llm === "ran"
            ? "Parley with the quartermaster… done"
            : "No parley — rules only",
          `${scan.flags.length} flag${scan.flags.length === 1 ? "" : "s"} hoisted.`,
        ]);
        setResult(scan);
        setScanCount((count) => count + 1);
        setPhase("results");
      } catch {
        setTrouble({
          message: "The boarding party never came back.",
          recovery: "Check your connection and press Board again, or paste the text instead.",
        });
        setLog((lines) => [...lines, "Boarding failed."]);
        setPhase("error");
      }
    },
    [selectedId, pasted, url],
  );

  const boardShip = useCallback(
    (id: string) => {
      setSelectedId(id);
      setPasted("");
      setUrl("");
      void board(id);
    },
    [board],
  );

  const toggleFlag = useCallback(
    (flag: Flag) => {
      setActivePhrase(null);
      setOpenFlagId((current) => {
        const next = current === flag.id ? null : flag.id;
        if (next && sourceText.length > 0) setHoldOpen(true);
        return next;
      });
    },
    [sourceText],
  );

  const selectPhrase = useCallback(
    (phrase: string) => {
      setOpenFlagId(null);
      setActivePhrase((current) => {
        const next = current === phrase ? null : phrase;
        if (next && sourceText.length > 0) setHoldOpen(true);
        return next;
      });
    },
    [sourceText],
  );

  const ticker = useMemo(() => {
    if (!result) {
      return [
        "Red Flags reads a privacy policy and quotes the parts that take from you.",
        "Every flag carries the sentence it came from, verbatim.",
        "Eight ships at anchor in the harbor.",
      ];
    }
    return [
      `${shipName} — plunder ${result.score.value}/100, ${result.score.rank}`,
      ...result.flags.slice(0, 3).map((flag) => flag.headline),
      result.decoder[0]
        ? `"${result.decoder[0].phrase}" appears ${result.decoder[0].count}×`
        : "No euphemisms decoded.",
    ];
  }, [result, shipName]);

  const busy = phase === "scanning";

  return (
    <>
      <div className="sea" aria-hidden />

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col gap-2 p-3 lg:h-dvh lg:overflow-hidden">
        <StatusBar ticker={ticker} scanCount={scanCount} />

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-[280px_minmax(0,1fr)_300px] lg:grid-rows-[minmax(0,1fr)_auto]">
          <Harbor
            selected={MATRIX.ships.find((ship) => ship.id === selectedId) ?? null}
            pasted={pasted}
            url={url}
            busy={busy}
            onPaste={(value) => {
              setPasted(value);
              if (value.length > 0) setSelectedId(null);
            }}
            onUrl={(value) => {
              setUrl(value);
              if (value.length > 0) setSelectedId(null);
            }}
            onBoard={() => void board()}
          />

          <Deck
            phase={phase}
            log={log}
            result={result}
            cached={cached}
            error={trouble}
            openFlagId={openFlagId}
            onToggleFlag={toggleFlag}
            onShare={() => setOverlay("share")}
          />

          <DecoderRing
            decoder={result?.decoder ?? []}
            activePhrase={activePhrase}
            onSelect={selectPhrase}
          />

          <FleetMatrix matrix={MATRIX} activeId={selectedId} busy={busy} onBoard={boardShip} />
        </div>

        <Hold
          text={sourceText}
          flags={result?.flags ?? []}
          decoder={result?.decoder ?? []}
          open={holdOpen}
          activeFlagId={openFlagId}
          activePhrase={activePhrase}
          note={holdNote}
          onToggle={() => setHoldOpen((open) => !open)}
        />

        <footer className="panel flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5 font-terminal text-[18px] leading-none">
          <a
            href="https://github.com/codeclawd/redflags-yard"
            className="text-foam underline decoration-dotted underline-offset-[3px] hover:text-amber"
          >
            Source
          </a>
          <span className="text-rope">·</span>
          <button
            type="button"
            onClick={() => setOverlay("how")}
            className="text-foam underline decoration-dotted underline-offset-[3px] hover:text-amber"
          >
            How it works
          </button>
          <span className="text-rope">·</span>
          <span className="text-amber-dim">Hackyard Yard #3 — built Sep 21–25 2026</span>
          <span className="ml-auto text-amber-dim">Best viewed at 1024×768 or better</span>
        </footer>
      </div>

      {overlay === "how" ? <HowItWorks onClose={() => setOverlay("none")} /> : null}
      {overlay === "share" && result ? (
        <ShareReport result={result} shipName={shipName} onClose={() => setOverlay("none")} />
      ) : null}
    </>
  );
}
