"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Share2 } from "lucide-react";
import type { CategoryId, Flag, ScanError, ScanErrorCode, ScanMeta, ScanResult } from "@/lib/types";
import { CheckYourOwn, type Status } from "@/components/check-your-own";
import { FlagList } from "@/components/flag-list";
import { FleetMatrix } from "@/components/fleet-matrix";
import { chargeCount, groupFindings, type ChargeGroup } from "@/components/group-findings";
import { HowItWorks } from "@/components/how-it-works";
import { PolicyText } from "@/components/policy-text";
import { Poster } from "@/components/poster";
import { pickSource, type Field, type ScanSource } from "@/components/scan-source";
import { ShareReport } from "@/components/share-report";
import { WeaselWords } from "@/components/weasel-words";
import { mockScan } from "@/components/mock-scan";
import type { FleetMatrix as FleetMatrixData, FleetPolicy } from "@/components/types";
import matrixJson from "@/public/baked/matrix.json";
import bakedJson from "@/public/baked/tiktok.json";

// The first frame is a finished scan. These two files are committed output of
// the real engine over the real stored policy (`pnpm bake`, no AI check),
// imported rather than fetched so the poster is painted, not awaited. Any scan
// the visitor starts replaces it.
const MATRIX = matrixJson as unknown as FleetMatrixData;
const BAKED = bakedJson as unknown as ScanResult;
const BAKED_ID = "tiktok";
const BAKED_APP = MATRIX.ships.find((ship) => ship.id === BAKED_ID) ?? MATRIX.ships[0];

/** Why the AI check has nothing to say, in words a visitor needs no manual for. */
const AI_MISSING: Record<Exclude<ScanMeta["llm"], "ran">, string> = {
  "skipped:no-key": "The AI check didn't run this time",
  "skipped:test": "The AI check didn't run this time",
  "skipped:timeout": "The AI check ran out of time",
  "skipped:rate-limit": "The AI check was busy",
  "skipped:error": "The AI check failed this time",
};

function aiNote(llm: ScanMeta["llm"], any: boolean) {
  if (llm === "ran") return "";
  return any
    ? ` ${AI_MISSING[llm]}: these come from the rules alone.`
    : ` ${AI_MISSING[llm]}, so only the rules read it.`;
}

function formatDay(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

type Trouble = { message: string; recovery: string };

const TROUBLE: Record<ScanErrorCode, Trouble> = {
  INVALID_INPUT: {
    message: "Nothing to scan.",
    recovery: "Paste a policy, paste a link to one, or pick an app below.",
  },
  FETCH_FAILED: {
    message: "That site would not let us read the page.",
    recovery: "Open the policy yourself, copy the text and paste it here.",
  },
  BLOCKED_URL: {
    message: "That address is on a private network.",
    recovery: "Only public http and https links can be scanned.",
  },
  NOT_HTML: {
    message: "That link is not a web page.",
    recovery: "Open it yourself, copy the policy and paste it here.",
  },
  EMPTY_CONTENT: {
    message: "Too little text to check.",
    recovery: "A policy needs at least 200 characters. Paste the whole document.",
  },
  CONTENT_TOO_LARGE: {
    message: "That document is over the 400,000 character cap.",
    recovery: "Paste the privacy policy alone, not the whole terms library.",
  },
  RATE_LIMITED: {
    message: "Too many scans from this address.",
    recovery: "Wait a minute and try again.",
  },
  SCAN_FAILED: {
    message: "The scan failed partway through.",
    recovery: "Try again. If it keeps happening, paste the text instead.",
  },
};

/** What is on the poster and below it. Replaced whole, so the parts never disagree. */
type Shown = {
  result: ScanResult;
  name: string;
  text: string;
  appId: string | null;
  /** The bake date while this is the committed cached scan; null once a live scan replaces it. */
  cached: string | null;
  /** Bumped on every live scan so the poster remounts and assembles again. */
  key: number;
};

type Target = { kind: "app"; id: string } | ScanSource;

export default function Page() {
  const [shown, setShown] = useState<Shown>({
    result: BAKED,
    name: BAKED_APP.name,
    text: "",
    appId: BAKED_ID,
    cached: MATRIX.bakedAt,
    key: 0,
  });
  const [pasted, setPasted] = useState("");
  const [url, setUrl] = useState("");
  const [lastEdited, setLastEdited] = useState<Field | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle", line: "" });

  const [openHeadline, setOpenHeadline] = useState<string | null>(null);
  const [activeFlagId, setActiveFlagId] = useState<string | null>(null);
  const [activePhrase, setActivePhrase] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<"none" | "how" | "share">("none");

  const posterRef = useRef<HTMLDivElement>(null);
  const evidenceRef = useRef<HTMLElement>(null);

  // The cached poster is complete without it; the policy text for the evidence
  // is the one thing that arrives after first paint. A scan that lands first
  // owns the text, and this late answer is dropped.
  useEffect(() => {
    let live = true;
    fetch(`/policies/${BAKED_ID}.json`)
      .then((response) => response.json() as Promise<FleetPolicy>)
      .then((policy) => {
        if (live) setShown((now) => (now.key === 0 ? { ...now, text: policy.text } : now));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const source = pickSource(pasted, url, lastEdited);

  const scan = useCallback(async (target: Target) => {
    const app = target.kind === "app" ? MATRIX.ships.find((s) => s.id === target.id) : undefined;
    if (target.kind === "app" && !app) return;
    const name = app
      ? app.name
      : target.kind === "paste"
        ? "the pasted policy"
        : hostOf(target.kind === "url" ? target.url : "");

    setStatus({ kind: "scanning", name });

    try {
      let text = "";
      if (app) {
        const policy = (await fetch(`/policies/${app.id}.json`).then((r) => r.json())) as FleetPolicy;
        text = policy.text;
      } else if (target.kind === "paste") {
        text = target.text;
      }

      let result: ScanResult;
      const mock = new URLSearchParams(window.location.search).get("mock") === "1";
      if (mock && text.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        result = mockScan(text, app?.id ?? "pasted");
      } else {
        const body = app
          ? { policyId: app.id }
          : target.kind === "paste"
            ? { text: target.text }
            : { url: target.kind === "url" ? target.url : "" };
        const response = await fetch("/api/scan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const payload = (await response.json()) as ScanResult | ScanError;
        if (!response.ok || "error" in payload) {
          const code = "code" in payload ? payload.code : "FETCH_FAILED";
          setStatus({ kind: "error", ...(TROUBLE[code] ?? TROUBLE.FETCH_FAILED) });
          return;
        }
        result = payload;
      }

      setOpenHeadline(null);
      setActiveFlagId(null);
      setActivePhrase(null);
      setShown((now) => ({
        result,
        name,
        text,
        appId: app?.id ?? null,
        cached: null,
        key: now.key + 1,
      }));
      const count = chargeCount(groupFindings(result.flags));
      setStatus({
        kind: "idle",
        line:
          result.flags.length > 0
            ? `Scanned ${name}: ${count.charges}, found in ${count.sentences}.`
            : `Scanned ${name}: no charges.`,
      });

      // On a phone the poster sits above the controls; bring the new one into view.
      const poster = posterRef.current;
      if (poster && poster.getBoundingClientRect().top < 0) {
        poster.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    } catch {
      setStatus({
        kind: "error",
        message: "The scan never came back.",
        recovery: "Check your connection and try again, or paste the text instead.",
      });
    }
  }, []);

  const { result, name, text, cached } = shown;
  const busy = status.kind === "scanning";
  const groups = useMemo(() => groupFindings(result.flags), [result.flags]);
  const count = chargeCount(groups);
  const provenance = cached ? `Saved scan of ${name}'s policy, ${formatDay(cached)}` : "Scanned just now";

  // Opening a charge shows its first sentence in context and in the policy pane.
  const openGroup = useCallback((group: ChargeGroup | null) => {
    setActivePhrase(null);
    setOpenHeadline(group?.headline ?? null);
    setActiveFlagId(group?.flags[0].id ?? null);
  }, []);

  const toggleGroup = useCallback(
    (group: ChargeGroup) => openGroup(openHeadline === group.headline ? null : group),
    [openGroup, openHeadline],
  );

  const pickFlag = useCallback((flag: Flag) => setActiveFlagId(flag.id), []);

  // A charge on the poster opens its evidence: the charge's group, first sentence showing.
  const showCharge = useCallback(
    (category: CategoryId) => {
      const first = result.flags.find((flag) => flag.category === category);
      const group = groups.find((g) => g.headline === first?.headline);
      if (!group) return;
      openGroup(group);
      requestAnimationFrame(() => {
        const section = evidenceRef.current;
        const row = section?.querySelector<HTMLElement>(
          `[data-group-row="${CSS.escape(group.headline)}"]`,
        );
        if (!section || !row) return;
        // Land on the heading when the row shows under it; otherwise on the row itself.
        const deep = row.getBoundingClientRect().top - section.getBoundingClientRect().top;
        (deep < window.innerHeight * 0.6 ? section : row).scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        row.querySelector("button")?.focus({ preventScroll: true });
      });
    },
    [result.flags, groups, openGroup],
  );

  const selectPhrase = useCallback((phrase: string) => {
    setOpenHeadline(null);
    setActiveFlagId(null);
    setActivePhrase((current) => (current === phrase ? null : phrase));
  }, []);

  return (
    <>
      <div className="sea" aria-hidden />

      <div className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-col px-4 sm:px-6">
        <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5">
          <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-display text-[30px] leading-none tracking-[-0.01em] text-parchment">
              Red Flags
            </span>
            <span className="text-[15px] text-parchment/80">
              Paste any privacy policy. See what it lets them take.
            </span>
          </p>
          <button
            type="button"
            onClick={() => setOverlay("how")}
            className="text-[14px] text-foam underline decoration-dotted underline-offset-[3px] hover:text-amber"
          >
            How it works
          </button>
        </header>

        <main className="flex flex-col gap-16 pb-10 lg:gap-20">
          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,600px)_minmax(340px,420px)] lg:justify-center lg:gap-12">
            <div ref={posterRef} className="flex scroll-mt-4 flex-col gap-3">
              <div
                aria-busy={busy}
                className={`transition-[opacity,filter] duration-300 ${busy ? "opacity-45 saturate-50" : ""}`}
              >
                <Poster
                  key={shown.key}
                  result={result}
                  name={name}
                  still={cached !== null}
                  onCharge={showCharge}
                />
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5 px-1">
                <p className="text-[13px] text-amber-dim">{provenance}</p>
                <button
                  type="button"
                  onClick={() => evidenceRef.current?.scrollIntoView({ behavior: "smooth" })}
                  className="flex items-center gap-1.5 text-[14px] text-foam underline decoration-dotted underline-offset-[3px] hover:text-amber"
                >
                  {groups.length > 0 ? `See all ${count.charges}` : "Read the policy"}
                  <ArrowDown aria-hidden className="size-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>

            <CheckYourOwn
              apps={MATRIX.ships}
              activeId={shown.appId}
              pasted={pasted}
              url={url}
              source={source}
              status={status}
              onPaste={(value) => {
                setPasted(value);
                setLastEdited("paste");
              }}
              onUrl={(value) => {
                setUrl(value);
                setLastEdited("url");
              }}
              onScan={() => {
                if (source) void scan(source);
              }}
              onPick={(id) => void scan({ kind: "app", id })}
            />
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:gap-x-10 lg:gap-y-20">
            <div className="order-1 flex flex-col gap-16 lg:order-none">
              <section
                ref={evidenceRef}
                aria-labelledby="evidence-heading"
                className="flex scroll-mt-4 flex-col gap-3"
              >
                <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                  <div className="flex flex-col gap-1">
                    <h2
                      id="evidence-heading"
                      className="font-display text-[40px] leading-none tracking-[-0.01em] text-parchment"
                    >
                      The evidence
                    </h2>
                    <p className="max-w-[60ch] text-[15px] text-amber-dim">
                      {groups.length > 0
                        ? `${count.charges} against ${name}, found in ${count.sentences}, worst first. Each sentence is quoted word for word.`
                        : `No charges against ${name}.`}
                      {aiNote(result.meta.llm, groups.length > 0)}
                    </p>
                  </div>
                  {result.flags.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setOverlay("share")}
                      className="flex items-center gap-1.5 rounded-[3px] border border-rope px-2.5 py-1.5 text-[13px] text-parchment hover:border-amber"
                    >
                      <Share2 aria-hidden className="size-3.5" strokeWidth={1.75} />
                      Copy the report
                    </button>
                  ) : null}
                </div>
                <FlagList
                  groups={groups}
                  openHeadline={openHeadline}
                  activeFlagId={activeFlagId}
                  text={text}
                  onToggle={toggleGroup}
                  onPick={pickFlag}
                />
              </section>

              <WeaselWords
                decoder={result.decoder}
                activePhrase={activePhrase}
                onSelect={selectPhrase}
              />
            </div>

            <aside className="order-3 lg:sticky lg:top-4 lg:order-none">
              <PolicyText
                text={text}
                name={name}
                flags={result.flags}
                decoder={result.decoder}
                activeFlagId={activeFlagId}
                activePhrase={activePhrase}
              />
            </aside>

            <div className="order-2 lg:order-none lg:col-span-2">
              <FleetMatrix
                matrix={MATRIX}
                activeId={shown.appId}
                busy={busy}
                onBoard={(id) => void scan({ kind: "app", id })}
              />
            </div>
          </div>
        </main>

        <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-rope py-4 text-[13px]">
          <a
            href="https://github.com/codeclawd/redflags-yard"
            className="text-foam underline decoration-dotted underline-offset-[3px] hover:text-amber"
          >
            Source
          </a>
          <button
            type="button"
            onClick={() => setOverlay("how")}
            className="text-foam underline decoration-dotted underline-offset-[3px] hover:text-amber"
          >
            How it works
          </button>
          <span className="text-amber-dim">Hackyard Yard #3, built Sep 21–25 2026</span>
          <span className="ml-auto text-amber-dim">Not legal advice.</span>
        </footer>
      </div>

      {overlay === "how" ? <HowItWorks onClose={() => setOverlay("none")} /> : null}
      {overlay === "share" ? (
        <ShareReport result={result} shipName={name} onClose={() => setOverlay("none")} />
      ) : null}
    </>
  );
}
