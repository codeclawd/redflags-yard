"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Flag, ScanError, ScanErrorCode, ScanResult } from "@/lib/types";
import { Deck } from "@/components/deck";
import { DecoderRing } from "@/components/decoder-ring";
import { Harbor } from "@/components/harbor";
import { Hold } from "@/components/hold";
import { HowItWorks } from "@/components/how-it-works";
import { ShareReport } from "@/components/share-report";
import { StatusBar } from "@/components/status-bar";
import { mockScan } from "@/components/mock-scan";
import type { FleetPolicy, FleetShip } from "@/components/types";

type Phase = "empty" | "scanning" | "results" | "error";
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
};

export default function Page() {
  const [fleet, setFleet] = useState<FleetShip[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [url, setUrl] = useState("");

  const [phase, setPhase] = useState<Phase>("empty");
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [trouble, setTrouble] = useState<Trouble | null>(null);
  const [shipName, setShipName] = useState("the ship");
  const [sourceText, setSourceText] = useState("");
  const [holdNote, setHoldNote] = useState<string | null>(null);

  const [openFlagId, setOpenFlagId] = useState<string | null>(null);
  const [activePhrase, setActivePhrase] = useState<string | null>(null);
  const [holdOpen, setHoldOpen] = useState(false);
  const [overlay, setOverlay] = useState<"none" | "how" | "share">("none");
  const [scanCount, setScanCount] = useState(0);

  useEffect(() => {
    let live = true;
    fetch("/policies/index.json")
      .then((response) => response.json() as Promise<FleetShip[]>)
      .then((ships) => {
        if (live) setFleet(ships);
      })
      .catch(() => {
        if (live) setFleet([]);
      });
    return () => {
      live = false;
    };
  }, []);

  const board = useCallback(async () => {
    const ship = fleet.find((entry) => entry.id === selectedId) ?? null;
    const usingPaste = !ship && pasted.trim().length > 0;
    const name = ship ? ship.name : usingPaste ? "the pasted policy" : url.trim();
    if (!ship && !usingPaste && url.trim().length === 0) return;

    setPhase("scanning");
    setResult(null);
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
  }, [fleet, selectedId, pasted, url]);

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

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col gap-3 p-3 lg:h-dvh lg:overflow-hidden">
        <StatusBar ticker={ticker} scanCount={scanCount} />

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[280px_minmax(0,1fr)_300px]">
          <Harbor
            fleet={fleet}
            selectedId={selectedId}
            pasted={pasted}
            url={url}
            busy={busy}
            onPick={(id) => {
              setSelectedId((current) => (current === id ? null : id));
              setPasted("");
              setUrl("");
            }}
            onPaste={(value) => {
              setPasted(value);
              if (value.length > 0) setSelectedId(null);
            }}
            onUrl={(value) => {
              setUrl(value);
              if (value.length > 0) setSelectedId(null);
            }}
            onBoard={board}
          />

          <Deck
            phase={phase}
            log={log}
            result={result}
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

        <footer className="panel flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 font-terminal text-[18px] leading-none">
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
