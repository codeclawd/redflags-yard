"use client";

import { Overlay } from "./overlay";

const STEPS: Array<[string, string]> = [
  [
    "Read",
    "The policy is split into sentences. Each one remembers exactly where it sits in the text, so every charge can point back to it.",
  ],
  [
    "Rules",
    "Seventeen kinds of harm, each with its own patterns, are checked against every sentence. A sentence that denies the harm (“we do not sell your data”), depends on your consent, or describes a legal requirement is skipped, so a denial is never read as a confession.",
  ],
  [
    "Weasel words",
    "Sixty-five phrases that sound harmless (affiliates, as long as necessary, similar technologies) are found separately and translated into what they allow.",
  ],
  [
    "AI check",
    "When it is available, an AI model reads the same text for anything the rules missed. It can only quote the policy: a quote that is not in the text word for word is thrown away. When the AI is busy, the rules stand on their own.",
  ],
  [
    "Score",
    "Each kind of harm counts once at full weight; repeats add a little, up to double. The total becomes a risk score out of 100 (higher is worse for you), a letter grade, and a rank: Honest merchant, Smuggler, Privateer, Pirate, or Ghost ship.",
  ],
];

export function HowItWorks({ onClose }: { onClose: () => void }) {
  return (
    <Overlay title="How it works" onClose={onClose}>
      <p className="mb-4 max-w-[68ch] text-[14px] text-amber-dim">
        Red Flags never rewords a policy. Every charge shows the exact sentence it came from, so
        you can check it in the full text yourself.
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
