import type {
  CategoryId,
  DecodedPhrase,
  Flag,
  ScanResult,
  Severity,
} from "@/lib/types";

/**
 * A local stand-in for `POST /api/scan`, reachable only with `?mock=1`.
 * It grounds its quotes in the real policy text the same way the engine does,
 * so an un-locatable quote is dropped rather than displayed.
 */

type Seed = {
  category: CategoryId;
  severity: Severity;
  headline: string;
  plainEnglish: string;
  quote: string;
  decoded?: { phrase: string; meaning: string };
};

const SEEDS: Seed[] = [
  {
    category: "biometric_sensitive",
    severity: "critical",
    headline: "They can take your face and your voice",
    plainEnglish:
      "Faceprints and voiceprints are permanent. You cannot change them after a breach.",
    quote:
      "We may collect biometric identifiers and biometric information as defined under US laws, such as faceprints and voiceprints, from your user content.",
  },
  {
    category: "cross_site_tracking",
    severity: "critical",
    headline: "They watch you on sites that are not theirs",
    plainEnglish:
      "A pixel on someone else's shop reports your visit back, whether or not you were signed in.",
    quote:
      "Some of our advertisers and other partners enable us to collect similar information directly from their websites or apps by integrating our TikTok Advertiser Tools (such as TikTok Pixel).",
  },
  {
    category: "affiliate_sharing",
    severity: "critical",
    headline: "They can pass you to companies they never name",
    plainEnglish:
      "\"Affiliates\" is an unbounded list. It grows every time the corporate group does.",
    quote:
      "We may share Information We Collect with affiliates controlled by, or under common control with, TikTok USDS Joint Venture as necessary for the purposes set forth within this Privacy Policy.",
    decoded: {
      phrase: "affiliates",
      meaning: "Any company in the corporate group, named or not, now or later.",
    },
  },
  {
    category: "precise_location",
    severity: "critical",
    headline: "They can log where you physically are",
    plainEnglish:
      "Precise location is a pattern of your home, your work and your nights out.",
    quote:
      "We may also collect precise location data, depending on your settings and as explained below.",
  },
  {
    category: "business_transfer",
    severity: "high",
    headline: "You are an asset in a sale",
    plainEnglish:
      "If the company is bought or goes under, your file moves with the furniture.",
    quote:
      "We may share Information We Collect in connection with or during negotiations of a corporate transaction, such as a merger, acquisition in full or in part, reorganization, asset sale, or in the unlikely event of bankruptcy.",
  },
  {
    category: "no_deletion",
    severity: "high",
    headline: "They keep it for as long as they decide",
    plainEnglish:
      "\"As long as necessary\" is measured by them, and it has no end date.",
    quote: "We retain information for as long as necessary to provide the Services",
    decoded: {
      phrase: "as long as necessary",
      meaning: "Indefinitely — the company alone judges what is necessary.",
    },
  },
  {
    category: "security_vague",
    severity: "medium",
    headline: "They promise nothing about third-party security",
    plainEnglish:
      "Once your data is handed on, the protections you were promised stop applying.",
    quote:
      "information collected by third parties may not have the same security protections as information you submit to us",
  },
];

const PHRASES: Array<{
  phrase: string;
  meaning: string;
  category: CategoryId;
  severity: Severity;
}> = [
  {
    phrase: "affiliates",
    meaning: "Any company in the corporate group, named or not, now or later.",
    category: "affiliate_sharing",
    severity: "critical",
  },
  {
    phrase: "service providers",
    meaning: "Unnamed contractors who get the same data you gave the company.",
    category: "affiliate_sharing",
    severity: "high",
  },
  {
    phrase: "business partners",
    meaning: "Commercial third parties chosen by them, disclosed to you as a category.",
    category: "affiliate_sharing",
    severity: "high",
  },
  {
    phrase: "as long as necessary",
    meaning: "Indefinitely — the company alone judges what is necessary.",
    category: "no_deletion",
    severity: "high",
  },
  {
    phrase: "precise location",
    meaning: "GPS-grade coordinates, not the city-level guess from your IP.",
    category: "precise_location",
    severity: "critical",
  },
  {
    phrase: "similar technologies",
    meaning: "Pixels, SDKs and fingerprints — the things that survive clearing cookies.",
    category: "cross_site_tracking",
    severity: "medium",
  },
  {
    phrase: "improve the Services",
    meaning: "Open-ended: covers analytics, profiling and product decisions alike.",
    category: "vague_euphemism",
    severity: "medium",
  },
];

const WEIGHT: Record<Severity, number> = { critical: 18, high: 10, medium: 5, low: 2 };

function locateAll(text: string, needle: string): Array<[number, number]> {
  const found: Array<[number, number]> = [];
  const haystack = text.toLowerCase();
  const probe = needle.toLowerCase();
  let from = 0;
  while (found.length < 40) {
    const at = haystack.indexOf(probe, from);
    if (at === -1) break;
    found.push([at, at + needle.length]);
    from = at + needle.length;
  }
  return found;
}

export function mockScan(text: string, policyId: string): ScanResult {
  const flags: Flag[] = [];
  for (const seed of SEEDS) {
    const start = text.indexOf(seed.quote);
    if (start === -1) continue;
    flags.push({
      id: `${seed.category}:${start}`,
      category: seed.category,
      severity: seed.severity,
      score: seed.severity === "critical" ? 0.9 : 0.7,
      headline: seed.headline,
      plainEnglish: seed.plainEnglish,
      quote: seed.quote,
      start,
      end: start + seed.quote.length,
      specificity: "specific",
      source: "rule",
      decoded: seed.decoded,
    });
  }

  const decoder: DecodedPhrase[] = [];
  for (const entry of PHRASES) {
    const positions = locateAll(text, entry.phrase);
    if (positions.length === 0) continue;
    decoder.push({ ...entry, count: positions.length, positions });
  }

  const raw =
    flags.reduce((sum, f) => sum + WEIGHT[f.severity], 0) +
    Math.min(15, decoder.reduce((sum, d) => sum + d.count, 0));
  const value = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    flags,
    decoder,
    score: {
      value,
      grade: value >= 80 ? "F" : value >= 60 ? "D" : value >= 40 ? "C" : value >= 20 ? "B" : "A",
      rank:
        value >= 80
          ? "Ghost ship"
          : value >= 60
            ? "Pirate"
            : value >= 40
              ? "Privateer"
              : value >= 20
                ? "Smuggler"
                : "Honest merchant",
    },
    meta: {
      sourceChars: text.length,
      sentenceCount: text.split(/(?<=\.)\s+/).length,
      ruleCount: flags.length,
      lexiconCount: decoder.length,
      llmCount: 0,
      llm: "skipped:rate-limit",
      ms: 412,
      policyId,
    },
  };
}
