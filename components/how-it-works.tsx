"use client";

import { Overlay } from "./overlay";

const STEPS: Array<[string, string]> = [
  [
    "Split",
    "The policy is normalised and cut into sentences with their character offsets kept, so every later claim can point at an exact span.",
  ],
  [
    "Rulebook",
    "Eighteen categories of harm, each with its own patterns, run over every sentence. A firewall drops sentences that are negated, conditional, or about legal process, so “we do not sell your data” never reads as selling.",
  ],
  [
    "Decoder ring",
    "A lexicon of phrases that sound harmless — affiliates, as long as necessary, similar technologies — is matched separately and translated into what it permits, not what the company does.",
  ],
  [
    "Parley",
    "When a model is available it reads the same text for what the rules missed. Every quote it returns must be found verbatim in the source or it is dropped. When it is rate-limited the deterministic result stands on its own.",
  ],
  [
    "Plunder",
    "Flags are weighted by severity, repeated categories count for less after the third, and the total becomes a grade and a rank.",
  ],
];

export function HowItWorks({ onClose }: { onClose: () => void }) {
  return (
    <Overlay title="How it works" onClose={onClose}>
      <p className="mb-4 max-w-[68ch] text-[14px] text-amber-dim">
        Red Flags never paraphrases a policy. Every flag carries the sentence it came from and the
        offset it sits at, so you can check it in the hold.
      </p>
      <ol className="divide-y divide-rope">
        {STEPS.map(([name, body]) => (
          <li key={name} className="py-3">
            <h3 className="font-terminal text-[22px] leading-none text-amber">{name}</h3>
            <p className="mt-1.5 max-w-[68ch] text-[14px] text-parchment">{body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[13px] text-amber-dim">
        Not legal advice. A policy is what a company reserves the right to do, not a record of what
        it has done.
      </p>
    </Overlay>
  );
}
