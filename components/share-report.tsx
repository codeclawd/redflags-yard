"use client";

import { useState } from "react";
import type { ScanResult } from "@/lib/types";
import { SEVERITY_LABEL } from "./severity";
import { Overlay } from "./overlay";

export function buildReport(result: ScanResult, shipName: string): string {
  const lines = [
    `RED FLAGS — ${shipName}`,
    `Risk score ${result.score.value}/100 (higher is worse) · grade ${result.score.grade}`,
    `${result.flags.length} charges across ${result.meta.sourceChars.toLocaleString("en-US")} characters.`,
    "",
  ];

  for (const flag of result.flags.slice(0, 5)) {
    lines.push(`[${SEVERITY_LABEL[flag.severity].toUpperCase()}] ${flag.headline}`);
    lines.push(`  "${flag.quote}"`);
    lines.push("");
  }

  lines.push("Quotes are verbatim from the published policy. Not legal advice.");
  return lines.join("\n");
}

export function ShareReport({
  result,
  shipName,
  onClose,
}: {
  result: ScanResult;
  shipName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const report = buildReport(result, shipName);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  };

  return (
    <Overlay title="The report" onClose={onClose}>
      <pre className="max-h-[46vh] overflow-auto border border-rope bg-ink-3 p-3 font-mono text-[13px] leading-[1.6] whitespace-pre-wrap text-parchment">
        {report}
      </pre>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="rounded-[3px] border border-amber bg-amber px-3 py-2 text-[14px] font-semibold text-ink hover:bg-gold"
        >
          Copy the report
        </button>
        {copied === "done" ? (
          <span className="font-terminal text-[18px] leading-none text-foam">
            Copied to the clipboard.
          </span>
        ) : null}
        {copied === "failed" ? (
          <span className="font-terminal text-[18px] leading-none text-blood">
            The browser refused the clipboard. Select the text above and copy it.
          </span>
        ) : null}
      </div>
    </Overlay>
  );
}
