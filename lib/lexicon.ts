// The decoder ring — the headline feature.
//
// These are phrases that read as harmless boilerplate and are in fact the load
// -bearing words of a privacy policy. Every `meaning` describes what the
// wording PERMITS, never what the company is accused of doing. That distinction
// is the difference between a useful tool and a libel generator.

import type { CategoryId, DecodedPhrase, Flag, Severity } from "@/lib/types";
import { isConditional, isNegated } from "@/lib/firewall";
import { HEADLINE_BY_CATEGORY, PLAIN_BY_CATEGORY, classifySpecificity } from "@/lib/rules";
import type { Sentence } from "@/lib/text";

export interface LexiconEntry {
  phrase: RegExp;
  display: string;
  meaning: string;
  category: CategoryId;
  severity: Severity;
}

export const LEXICON: LexiconEntry[] = [
  {
    phrase: /\btrusted\s+partners?\b/gi,
    display: "trusted partners",
    meaning: "Lets them hand your data to companies they never name, chosen by them, trusted by them.",
    category: "affiliate_sharing",
    severity: "critical",
  },
  {
    phrase: /\b(?:select|selected|valued|carefully\s+chosen)\s+partners?\b/gi,
    display: "select partners",
    meaning: "Same open-ended list as \"trusted partners\": the adjective does the work, the contract does not.",
    category: "affiliate_sharing",
    severity: "critical",
  },
  {
    phrase: /\baffiliates?\b/gi,
    display: "affiliates",
    meaning: "Any company they own or that owns them, now or after the next acquisition.",
    category: "affiliate_sharing",
    severity: "critical",
  },
  {
    phrase: /\bcorporate\s+(?:family|group)\b/gi,
    display: "corporate family",
    meaning: "A group of companies whose membership can change without your data moving anywhere you can see.",
    category: "affiliate_sharing",
    severity: "critical",
  },
  {
    phrase: /\bcompanies\s+we\s+own\b/gi,
    display: "companies we own",
    meaning: "Internal sharing across the whole corporate structure, which can grow at any time.",
    category: "affiliate_sharing",
    severity: "critical",
  },
  {
    phrase: /\bbusiness\s+partners?\b/gi,
    display: "business partners",
    meaning: "Outside companies with a commercial relationship, never listed by name.",
    category: "affiliate_sharing",
    severity: "high",
  },
  {
    phrase: /\bservice\s+providers?\b/gi,
    display: "service providers",
    meaning: "Unnamed contractors who get your data to do work on the company's behalf.",
    category: "affiliate_sharing",
    severity: "high",
  },
  {
    phrase: /\b(?:vendors?|suppliers?|processors?)\b/gi,
    display: "vendors",
    meaning: "Third parties handed your data under a contract you will never be shown.",
    category: "affiliate_sharing",
    severity: "medium",
  },
  {
    phrase: /\bthird\s+part(?:y|ies)\b/gi,
    display: "third parties",
    meaning: "Anyone who is not you and not them: the category is unbounded by design.",
    category: "affiliate_sharing",
    severity: "high",
  },
  {
    phrase: /\bimprove\s+(?:our\s+)?(?:services?|products?)\b/gi,
    display: "improve our services",
    meaning: "A purpose broad enough to cover nearly any use of your data, including building new products.",
    category: "vague_euphemism",
    severity: "medium",
  },
  {
    phrase: /\bimprove\s+your\s+experience\b/gi,
    display: "improve your experience",
    meaning: "Justifies collection without naming what is collected or how the improvement is measured.",
    category: "vague_euphemism",
    severity: "medium",
  },
  {
    phrase: /\b(?:personalize|personalise|customize|customise|tailor)\s+(?:your\s+)?(?:experience|ads?|advertising|content|recommendations)\b/gi,
    display: "personalize your experience",
    meaning: "Profiling: they model who you are from your behaviour to decide what you see.",
    category: "cross_site_tracking",
    severity: "high",
  },
  {
    phrase: /\blegitimate\s+interests?\b/gi,
    display: "legitimate interests",
    meaning: "A legal basis they assert themselves, with no consent step and no list you can check.",
    category: "vague_euphemism",
    severity: "medium",
  },
  {
    phrase: /\bbusiness\s+purposes?\b/gi,
    display: "business purposes",
    meaning: "Any use the company considers commercial, which is most uses.",
    category: "vague_euphemism",
    severity: "medium",
  },
  {
    phrase: /\bcommercial\s+purposes?\b/gi,
    display: "commercial purposes",
    meaning: "Use of your data to make money, stated without saying how.",
    category: "vague_euphemism",
    severity: "medium",
  },
  {
    phrase: /\bde-?identified\b/gi,
    display: "de-identified",
    meaning: "Names stripped, but re-identification from the remaining detail is routinely possible.",
    category: "vague_euphemism",
    severity: "medium",
  },
  {
    phrase: /\baggregated?\b/gi,
    display: "aggregated",
    meaning: "Grouped data that often still singles you out when the group is small.",
    category: "vague_euphemism",
    severity: "medium",
  },
  {
    phrase: /\banonymi[sz]ed\b/gi,
    display: "anonymized",
    meaning: "A claim, not a guarantee: the standard for what counts as anonymous is theirs.",
    category: "vague_euphemism",
    severity: "medium",
  },
  {
    phrase: /\bpseudonymous\s+(?:identifiers?|data|information)\b/gi,
    display: "pseudonymous identifiers",
    meaning: "Your name swapped for a stable code that still follows you everywhere.",
    category: "cross_site_tracking",
    severity: "high",
  },
  {
    phrase: /\b(?:inferred|derived)\s+(?:data|information|attributes?|characteristics?)\b/gi,
    display: "inferred data",
    meaning: "Guesses about you they generate themselves: income, health, politics, you never supplied them.",
    category: "cross_site_tracking",
    severity: "high",
  },
  {
    phrase: /\bpublicly\s+available\s+(?:information|data|sources?)\b/gi,
    display: "publicly available information",
    meaning: "Data scraped from elsewhere and merged into your profile without asking.",
    category: "cross_site_tracking",
    severity: "medium",
  },
  {
    phrase: /\bincluding,?\s+but\s+not\s+limited\s+to\b/gi,
    display: "including but not limited to",
    meaning: "The list that follows is an example, not a limit. Anything else also counts.",
    category: "vague_euphemism",
    severity: "medium",
  },
  {
    phrase: /\bfrom\s+time\s+to\s+time\b/gi,
    display: "from time to time",
    meaning: "Whenever they decide, on no schedule, with no notice owed to you.",
    category: "silent_changes",
    severity: "medium",
  },
  {
    phrase: /\bmay\s+(?:share|collect|use|disclose|process|retain|sell)\b/gi,
    display: "may share",
    meaning: "Permission, not prediction: \"may\" describes what is allowed, and allowed things happen.",
    category: "vague_euphemism",
    severity: "medium",
  },
  {
    phrase: /\bas\s+long\s+as\s+(?:is\s+)?necessary\b/gi,
    display: "as long as necessary",
    meaning: "A retention period with no number in it, decided by them.",
    category: "no_deletion",
    severity: "high",
  },
  {
    phrase: /\b(?:as|where|if)\s+(?:otherwise\s+)?permitted\s+by\s+(?:applicable\s+)?law\b/gi,
    display: "as permitted by law",
    meaning: "Expands the policy to the legal maximum in every country they operate in.",
    category: "vague_euphemism",
    severity: "medium",
  },
  {
    phrase: /\bbusiness\s+transfer\b/gi,
    display: "business transfer",
    meaning: "Your data moves with the company when it is bought, sold or broken up.",
    category: "business_transfer",
    severity: "high",
  },
  {
    phrase: /\b(?:successor|acquirer|purchaser)\b/gi,
    display: "successor",
    meaning: "Whoever buys the company inherits your data, under whatever policy they write next.",
    category: "business_transfer",
    severity: "high",
  },
  {
    phrase: /\b(?:merger|acquisition)\b/gi,
    display: "merger or acquisition",
    meaning: "Treats your data as a transferable asset in a corporate deal you are not party to.",
    category: "business_transfer",
    severity: "high",
  },
  {
    phrase: /\bbankruptcy\b/gi,
    display: "bankruptcy",
    meaning: "If the company fails, your data is inventory a court can order sold.",
    category: "business_transfer",
    severity: "high",
  },
  {
    phrase: /\bindustry[\s-]standard\b/gi,
    display: "industry-standard",
    meaning: "Benchmarked against everyone else, including everyone else who has been breached.",
    category: "security_vague",
    severity: "medium",
  },
  {
    phrase: /\b(?:reasonable|appropriate|commercially\s+reasonable)\s+(?:security\s+)?(?:measures|safeguards|steps|precautions|practices)\b/gi,
    display: "reasonable security measures",
    meaning: "A standard they define, with no specific control you could hold them to.",
    category: "security_vague",
    severity: "medium",
  },
  {
    phrase: /\bby\s+using\s+(?:the|our|this)\s+(?:services?|site|website|platform|app)\b[^.]{0,60}\byou\s+agree\b/gi,
    display: "by using the service you agree",
    meaning: "Consent by showing up: you agreed before you could have read this.",
    category: "implied_consent",
    severity: "medium",
  },
  {
    phrase: /\bcontinued\s+use\b/gi,
    display: "continued use",
    meaning: "Not leaving counts as accepting whatever the policy says next.",
    category: "implied_consent",
    severity: "medium",
  },
  {
    phrase: /\bopt\s*-?\s*out\b/gi,
    display: "opt out",
    meaning: "On by default: the privacy-protecting choice is an errand you have to run.",
    category: "dark_pattern_optout",
    severity: "medium",
  },
  {
    phrase: /\b(?:may\s+not|cannot|can't|unable\s+to)\s+(?:be\s+able\s+to\s+)?opt\s*-?\s*out\b/gi,
    display: "may not be able to opt out",
    meaning: "States plainly that for some uses there is no off switch at all.",
    category: "dark_pattern_optout",
    severity: "high",
  },
  {
    // Lookbehind, not \b: the hyphen in \"non-precise\" is a word boundary. Same fix as rules.ts;
    // lib/negated-prefix.test.ts now checks every pattern in both engines for this.
    phrase: /(?<![-\w])precise\s+(?:geo)?location\b/gi,
    display: "precise location",
    meaning: "Coordinates accurate enough to identify your home, workplace and clinic.",
    category: "precise_location",
    severity: "critical",
  },
  {
    phrase: /\bbackground\s+location\b/gi,
    display: "background location",
    meaning: "Location collected while the app is closed, so the trail never stops.",
    category: "precise_location",
    severity: "critical",
  },
  {
    phrase: /\b(?:advertising|mobile\s+ad)\s+(?:identifiers?|ids?)\b/gi,
    display: "advertising identifiers",
    meaning: "A device-wide code that ties your activity across unrelated apps into one profile.",
    category: "cross_site_tracking",
    severity: "critical",
  },
  {
    phrase: /\b(?:analytics|measurement)\s+partners?\b/gi,
    display: "analytics partners",
    meaning: "Outside firms that receive your behaviour data to measure and model you.",
    category: "cross_site_tracking",
    severity: "high",
  },
  {
    phrase: /\b(?:social\s+plugins?|tracking\s+pixels?|web\s+beacons?|pixels?)\b/gi,
    display: "pixels",
    meaning: "Invisible code on a page that reports your visit back to a third party.",
    category: "cross_site_tracking",
    severity: "high",
  },
  {
    phrase: /\bsdks?\b/gi,
    display: "SDKs",
    meaning: "Third-party code inside the app that can collect data on its own terms.",
    category: "cross_site_tracking",
    severity: "medium",
  },
  {
    phrase: /\bcross[\s-]context\s+behaviou?ral\s+advertising\b/gi,
    display: "cross-context behavioral advertising",
    meaning: "Ads targeted from your activity on sites and apps that have nothing to do with theirs.",
    category: "cross_site_tracking",
    severity: "critical",
  },
  {
    phrase: /\b(?:data\s+enrichment|enrich(?:ed|ing)?\s+(?:your\s+)?(?:profile|data|information))\b/gi,
    display: "data enrichment",
    meaning: "Buying extra facts about you from outside and bolting them onto your profile.",
    category: "cross_site_tracking",
    severity: "critical",
  },
  {
    phrase: /\bthird[\s-]party\s+sources?\b/gi,
    display: "third-party sources",
    meaning: "Data about you obtained from companies you have no relationship with.",
    category: "cross_site_tracking",
    severity: "high",
  },
  {
    phrase: /\bverify\s+your\s+identity\b/gi,
    display: "verify your identity",
    meaning: "Often means a face scan or an ID document, kept after the check is done.",
    category: "biometric_sensitive",
    severity: "high",
  },
  {
    phrase: /\b(?:voice|audio)\s+recordings?\b/gi,
    display: "voice recordings",
    meaning: "Captured audio that can be stored, analysed and, in places, played to a person.",
    category: "biometric_sensitive",
    severity: "high",
  },
  {
    phrase: /\bhuman\s+review(?:ers?)?\b/gi,
    display: "human reviewers",
    meaning: "People, often contractors, can open and read or listen to what you sent.",
    category: "human_review",
    severity: "high",
  },
  {
    phrase: /\btrain\s+(?:our\s+)?(?:ai|machine\s+learning|ml)?\s*models?\b/gi,
    display: "train our models",
    meaning: "Your content becomes training data, and a trained model cannot forget on request.",
    category: "ai_training",
    severity: "critical",
  },
  {
    phrase: /\b(?:machine\s+learning|artificial\s+intelligence)\b/gi,
    display: "machine learning",
    meaning: "Signals it may be processing your data to build models, not just to serve you.",
    category: "ai_training",
    severity: "medium",
  },
  {
    phrase: /\bretain[^.]{0,40}\beven\s+after\s+(?:you\s+)?(?:delete|deactivate|close)\b/gi,
    display: "retain even after you delete",
    meaning: "Deleting the account is not deleting the data: copies outlive it.",
    category: "no_deletion",
    severity: "high",
  },
  {
    phrase: /\bsell\s+(?:or\s+share\s+)?(?:your\s+)?personal\s+information\b/gi,
    display: "sell or share personal information",
    meaning: "Under US privacy law \"share\" also covers ad targeting, not only money changing hands.",
    category: "sells_shares",
    severity: "critical",
  },
  {
    phrase: /\b(?:targeted|interest[\s-]based)\s+advertising\b/gi,
    display: "interest-based advertising",
    meaning: "Ads chosen from a profile of your behaviour, which must be built and kept to work.",
    category: "cross_site_tracking",
    severity: "high",
  },
  {
    phrase: /\b(?:profiling|automated\s+decision[\s-]?making)\b/gi,
    display: "automated decision-making",
    meaning: "Software scores or sorts you, with no person accountable for the outcome.",
    category: "cross_site_tracking",
    severity: "high",
  },
  {
    phrase: /\b(?:address\s+book|contact\s+list|friends?\s+list|your\s+contacts)\b/gi,
    display: "address book",
    meaning: "Other people's phone numbers and emails, uploaded without those people being asked.",
    category: "contacts_harvest",
    severity: "high",
  },
  {
    phrase: /\bcookies\s+and\s+similar\s+technologies\b/gi,
    display: "cookies and similar technologies",
    meaning: "\"Similar\" quietly covers fingerprinting and storage that you cannot clear like a cookie.",
    category: "cross_site_tracking",
    severity: "medium",
  },
  {
    phrase: /\b(?:device\s+)?fingerprint(?:ing)?\b/gi,
    display: "device fingerprint",
    meaning: "Identifies your device from its settings, so clearing cookies does not shake it off.",
    category: "cross_site_tracking",
    severity: "critical",
  },
  {
    phrase: /\bprobabilistic\s+match(?:ing)?\b/gi,
    display: "probabilistic matching",
    meaning: "Guesses that two devices are the same person, and acts on the guess.",
    category: "cross_site_tracking",
    severity: "critical",
  },
  {
    phrase: /\breserve\s+the\s+right\b/gi,
    display: "reserve the right",
    meaning: "Claims a power for later that they are not exercising yet, and need not announce.",
    category: "silent_changes",
    severity: "medium",
  },
  {
    phrase: /\bat\s+any\s+time\b/gi,
    display: "at any time",
    meaning: "No notice period and no trigger: the change can land whenever it suits them.",
    category: "silent_changes",
    severity: "medium",
  },
  {
    phrase: /\b(?:binding\s+)?arbitration\b/gi,
    display: "binding arbitration",
    meaning: "Disputes go to a private arbitrator instead of a court, usually with no appeal.",
    category: "arbitration",
    severity: "high",
  },
  {
    phrase: /\bclass\s+action\s+waiver\b/gi,
    display: "class action waiver",
    meaning: "You must sue alone, which makes small harms too expensive to pursue.",
    category: "arbitration",
    severity: "high",
  },
  {
    phrase: /\b(?:perpetual|irrevocable)\b/gi,
    display: "perpetual",
    meaning: "The permission you grant does not end, including after you delete the content.",
    category: "perpetual_license",
    severity: "high",
  },
  {
    phrase: /\broyalty[\s-]free\b/gi,
    display: "royalty-free",
    meaning: "They can use what you made commercially and owe you nothing for it.",
    category: "perpetual_license",
    severity: "high",
  },
  {
    phrase: /\bsublicensable\b/gi,
    display: "sublicensable",
    meaning: "They can pass the rights to your content on to companies you never dealt with.",
    category: "perpetual_license",
    severity: "high",
  },
];

const MEANING_MAX = 120;

export interface LexiconRun {
  decoder: DecodedPhrase[];
  flags: Flag[];
}

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/**
 * Sweep the source for euphemisms. Every hit becomes a decoder entry; hits at
 * medium severity or worse also become flags on the containing sentence,
 * unless the firewall suppresses that sentence.
 */
export function runLexicon(source: string, sentences: Sentence[]): LexiconRun {
  const decoder: DecodedPhrase[] = [];
  const flags: Flag[] = [];
  const seenFlag = new Set<string>();

  // Keyed by sentence AND category: a legal reason excuses a disclosure but not
  // retention (see LEGAL_REASON_STILL_HARMS), so one verdict per sentence is wrong.
  const suppressed = new Map<string, boolean>();
  const isSuppressed = (s: Sentence, category: string) => {
    const key = `${s.start}:${category}`;
    let v = suppressed.get(key);
    if (v === undefined) {
      v = isNegated(s.text) || isConditional(s.text, category);
      suppressed.set(key, v);
    }
    return v;
  };

  for (const entry of LEXICON) {
    const re = new RegExp(entry.phrase.source, entry.phrase.flags.includes("g") ? entry.phrase.flags : entry.phrase.flags + "g");
    const positions: Array<[number, number]> = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) {
      if (m[0].length === 0) { re.lastIndex++; continue; }
      positions.push([m.index, m.index + m[0].length]);
      if (positions.length >= 200) break;
    }
    if (positions.length === 0) continue;

    decoder.push({
      phrase: entry.display,
      meaning: entry.meaning.slice(0, MEANING_MAX),
      category: entry.category,
      severity: entry.severity,
      count: positions.length,
      positions,
    });

    if (SEVERITY_ORDER[entry.severity] > SEVERITY_ORDER.medium) continue;

    for (const [at] of positions) {
      const sentence = sentences.find((s) => at >= s.start && at < s.end);
      if (!sentence || isSuppressed(sentence, entry.category)) continue;
      const key = `${entry.category}:${sentence.start}`;
      if (seenFlag.has(key)) continue;
      seenFlag.add(key);
      flags.push({
        id: key,
        category: entry.category,
        severity: entry.severity,
        score: 0.55,
        // The category's own charge, so this sentence joins that charge's group; what the
        // specific phrase allows is kept in `decoded` and shown on the sentence's card.
        headline: HEADLINE_BY_CATEGORY[entry.category] ?? `The wording "${entry.display}" hides what it allows`,
        plainEnglish: PLAIN_BY_CATEGORY[entry.category] ?? entry.meaning,
        quote: sentence.text,
        start: sentence.start,
        end: sentence.end,
        specificity: classifySpecificity(sentence.text),
        source: "lexicon",
        decoded: { phrase: entry.display, meaning: entry.meaning },
      });
    }
  }

  decoder.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.count - a.count || a.phrase.localeCompare(b.phrase));
  return { decoder, flags };
}

/** Index of display phrase -> meaning, for enriching rule flags. */
export function lexiconHitsInRange(source: string, start: number, end: number): LexiconEntry[] {
  const slice = source.slice(start, end);
  return LEXICON.filter((e) => new RegExp(e.phrase.source, e.phrase.flags.replace("g", "")).test(slice));
}
