import { describe, expect, it } from "vitest";
import { RULES } from "@/lib/rules";
import { LEXICON } from "@/lib/lexicon";

// Shared-seam guard. `\bprecise location` matched inside "non-precise location" (the
// hyphen is a word boundary). It was fixed in rules.ts and survived as a duplicate in
// lexicon.ts until a reviewer hit it. Rather than patch instances, this checks EVERY
// pattern in BOTH engines against hyphen-negated phrases, so a new pattern with the
// same flaw fails here instead of on a public policy.
const NEGATED = [
  "non-precise location",
  "non-precise geolocation",
  "non-sensitive information",
  "non-sensitive personal data",
  "non-personal information",
  "non-personally identifiable information",
];

const all: Array<[string, RegExp]> = [
  ...RULES.flatMap((r) => r.patterns.map((p): [string, RegExp] => [`rule ${r.id}`, p])),
  ...LEXICON.map((e): [string, RegExp] => [`lexicon ${e.display}`, e.phrase]),
];

describe("no pattern matches inside a hyphen-negated word", () => {
  for (const probe of NEGATED) {
    it(`nothing fires on "${probe}"`, () => {
      const hits = all
        .filter(([, re]) => new RegExp(re.source, re.flags.replace("g", "")).test(probe))
        .map(([name]) => name);
      expect(hits).toEqual([]);
    });
  }
});
