// Deterministic sentence-level rule pass. This table is the product's spine:
// the LLM layer is optional, this is not.

import type { CategoryId, Flag, Severity, Specificity } from "@/lib/types";
import { isConditional, isNegated } from "@/lib/firewall";
import type { Sentence } from "@/lib/text";

export interface Rule {
  id: string;
  category: CategoryId;
  severity: Severity;
  patterns: RegExp[];
  negativeGuards?: RegExp[];
  headline: string;
  plainEnglish: string;
  /** When true, the law-enforcement / consent guards may suppress this rule. */
  firewall: boolean;
}

export const SEVERITY_BY_CATEGORY: Record<CategoryId, Severity> = {
  sells_shares: "critical",
  cross_site_tracking: "critical",
  biometric_sensitive: "critical",
  precise_location: "critical",
  ai_training: "critical",
  affiliate_sharing: "critical",
  no_deletion: "high",
  perpetual_license: "high",
  arbitration: "high",
  childrens_data: "high",
  business_transfer: "high",
  contacts_harvest: "high",
  human_review: "high",
  silent_changes: "medium",
  implied_consent: "medium",
  dark_pattern_optout: "medium",
  security_vague: "medium",
  vague_euphemism: "medium",
};

export const RULES: Rule[] = [
  {
    id: "sells_shares",
    category: "sells_shares",
    severity: "critical",
    firewall: true,
    headline: "They can sell or trade your personal data",
    plainEnglish: "This wording lets them hand your data to other companies in exchange for money or something of value.",
    patterns: [
      /\bsell(?:s|ing)?\b[^.]{0,60}\b(?:personal\s+(?:information|data)|your\s+(?:information|data))\b/i,
      /\b(?:sale|sell|sold)\s+of\s+(?:your\s+)?personal\s+(?:information|data)\b/i,
      /\b(?:sell|share)\s+(?:or\s+share\s+)?(?:your\s+)?(?:personal\s+)?(?:information|data)\s+(?:with|to)\s+third\s+part/i,
      /\bmonetize\b[^.]{0,40}\b(?:data|information|content)\b/i,
      /\bexchange\s+for\s+(?:monetary|valuable)\s+consideration\b/i,
      /\b(?:sell|share)\s+personal\s+information\s+as\s+(?:those\s+terms\s+are\s+)?defined\b/i,
    ],
    negativeGuards: [/\bsell\s+(?:you\s+)?(?:products|goods|merchandise|tickets|subscriptions)\b/i, /\bsellers?\b\s+(?:on|using)\s+/i],
  },
  {
    id: "cross_site_tracking",
    category: "cross_site_tracking",
    severity: "critical",
    firewall: true,
    headline: "They follow you across other sites and apps",
    plainEnglish: "They build a picture of you from activity that happens outside their own product, on sites and apps they do not run.",
    patterns: [
      /\b(?:across|on)\s+(?:other|third[\s-]party|different)\s+(?:websites?|sites?|apps?|applications?|platforms?|services?|devices?)\b/i,
      /\bcross[\s-](?:site|context|device|app)\b/i,
      /\b(?:device\s+)?fingerprint(?:ing)?\b/i,
      /\bprobabilistic\s+match(?:ing)?\b/i,
      /\bdata\s+brokers?\b/i,
      /\b(?:pixels?|web\s+beacons?|tracking\s+technologies|sdks?)\b[^.]{0,80}\b(?:third[\s-]part|partners?|advertis)/i,
      /\b(?:link|combine|associate)\s+(?:your\s+)?(?:information|data|activity)\s+(?:across|from)\s+(?:different|other|multiple)\b/i,
      /\binterest[\s-]based\s+advertising\b/i,
    ],
  },
  {
    id: "biometric_sensitive",
    category: "biometric_sensitive",
    severity: "critical",
    firewall: true,
    headline: "They collect biometric or otherwise sensitive data about you",
    plainEnglish: "Faceprints, voiceprints, health, religion or sexuality sit in a different risk class: unlike a password, you cannot change them after a breach.",
    patterns: [
      /\bbiometric\b/i,
      /\b(?:face|facial|voice|iris|finger)\s*(?:print|prints|geometry|recognition|scan|template)/i,
      /\b(?:faceprints?|voiceprints?)\b/i,
      /\bgenetic\s+(?:data|information)\b/i,
      /\b(?:health|medical)\s+(?:data|information|conditions?)\b[^.]{0,60}\b(?:collect|process|use|share)/i,
      /\b(?:sexual\s+orientation|religious\s+(?:beliefs?|affiliation)|political\s+(?:opinions?|affiliation)|racial\s+or\s+ethnic\s+origin|trade\s+union)\b/i,
      /\bsensitive\s+(?:personal\s+)?(?:information|data|categories)\b/i,
    ],
  },
  {
    id: "precise_location",
    category: "precise_location",
    severity: "critical",
    firewall: true,
    headline: "They can pinpoint exactly where you are",
    plainEnglish: "Precise location over time reveals your home, workplace, doctor and place of worship, not just a city.",
    patterns: [
      /\bprecise\s+(?:geo)?location\b/i,
      /\b(?:gps|global\s+positioning)\b/i,
      /\blocation\s+(?:history|data)\b[^.]{0,60}\b(?:collect|store|retain|share|use)/i,
      /\bbackground\s+location\b/i,
      /\b(?:latitude|longitude)\b/i,
      /\bwhere\s+you\s+(?:are|go|have\s+been)\b/i,
      /\b(?:wi-?fi|bluetooth|cell\s+tower)\s+(?:access\s+points?|signals?|information)\b[^.]{0,60}\blocation\b/i,
    ],
  },
  {
    id: "ai_training",
    category: "ai_training",
    severity: "critical",
    firewall: true,
    headline: "They can train AI models on your content",
    plainEnglish: "What you write, say or upload can become training material, and a trained model cannot be un-trained on request.",
    patterns: [
      /\btrain(?:ing|s|ed)?\b[^.]{0,60}\b(?:models?|algorithms?|machine\s+learning|artificial\s+intelligence|ai\b)/i,
      /\b(?:machine\s+learning|artificial\s+intelligence|ai)\s+(?:models?|systems?|technologies)\b[^.]{0,80}\b(?:your|user)\s+(?:content|data|information)\b/i,
      /\b(?:improve|develop|build|refine)\b[^.]{0,40}\b(?:our\s+)?(?:machine\s+learning|ai|algorithms?|models?)\b/i,
      /\bgenerative\s+ai\b/i,
      /\blarge\s+language\s+models?\b/i,
    ],
  },
  {
    id: "affiliate_sharing",
    category: "affiliate_sharing",
    severity: "critical",
    firewall: true,
    headline: "They can pass your data around an unnamed group of companies",
    plainEnglish: "\"Affiliates\", \"partners\" and \"corporate family\" are open-ended: the list can grow without telling you.",
    patterns: [
      /\b(?:our\s+)?affiliates?\b/i,
      /\bcorporate\s+(?:family|group|affiliates)\b/i,
      /\b(?:trusted|select|selected|valued|carefully\s+chosen)\s+(?:third[\s-]party\s+)?partners?\b/i,
      /\b(?:companies|entities)\s+(?:that\s+)?(?:we\s+own|within\s+our\s+(?:group|family)|under\s+common\s+control)\b/i,
      /\b(?:subsidiaries|parent\s+compan)/i,
      /\bbusiness\s+partners?\b/i,
      /\bthird[\s-]party\s+(?:partners?|companies|providers?)\b[^.]{0,60}\b(?:share|disclose|provide|transfer)\b/i,
    ],
  },
  {
    id: "no_deletion",
    category: "no_deletion",
    severity: "high",
    firewall: true,
    headline: "Deleting your account does not delete your data",
    plainEnglish: "Copies can outlive the account: in backups, in logs, or simply for \"as long as necessary\".",
    patterns: [
      /\bretain\b[^.]{0,80}\b(?:as\s+long\s+as|indefinitely|necessary|permitted)\b/i,
      /\b(?:even\s+)?after\s+(?:you\s+)?(?:delete|deactivate|close|terminate)\b/i,
      /\bindefinitel(?:y|e)\b/i,
      /\bbackup(?:s)?\b[^.]{0,60}\b(?:retain|remain|persist|copies)\b/i,
      /\bcopies\s+(?:may\s+)?remain\b/i,
      /\b(?:residual|archived)\s+copies\b/i,
      /\bwe\s+(?:may\s+)?(?:keep|retain)\b[^.]{0,50}\bfor\s+as\s+long\s+as\b/i,
    ],
  },
  {
    id: "perpetual_license",
    category: "perpetual_license",
    severity: "high",
    firewall: false,
    headline: "You grant them a sweeping licence to your content",
    plainEnglish: "A perpetual, irrevocable, worldwide, royalty-free licence means they can keep using what you posted even after you take it down.",
    patterns: [
      /\b(?:perpetual|irrevocable)\b[^.]{0,80}\blicen[sc]e\b/i,
      /\blicen[sc]e\b[^.]{0,120}\b(?:perpetual|irrevocable|worldwide|royalty[\s-]free|sublicensable|transferable)\b/i,
      /\broyalty[\s-]free\b[^.]{0,60}\blicen[sc]e\b/i,
      /\b(?:grant|granting)\s+(?:us|our)\b[^.]{0,80}\b(?:right|licen[sc]e)\b[^.]{0,80}\b(?:use|reproduce|modify|distribute|display)\b/i,
      /\bsublicens(?:e|able|ing)\b/i,
    ],
  },
  {
    id: "arbitration",
    category: "arbitration",
    severity: "high",
    firewall: false,
    headline: "You give up your day in court",
    plainEnglish: "Forced arbitration and a class-action waiver mean disputes go to a private arbitrator you cannot appeal, alone.",
    patterns: [
      /\b(?:binding\s+)?arbitration\b/i,
      /\bclass\s+(?:action|arbitration)\s+waiver\b/i,
      /\bwaive\b[^.]{0,80}\b(?:jury\s+trial|class\s+action|right\s+to\s+sue)\b/i,
      /\bindividual\s+basis\b[^.]{0,60}\b(?:not|no)\s+(?:as\s+a\s+)?class\b/i,
      /\bjury\s+trial\b/i,
    ],
  },
  {
    id: "childrens_data",
    category: "childrens_data",
    severity: "high",
    firewall: true,
    headline: "They handle data about children",
    plainEnglish: "Data collected about minors follows them for decades, and the consent was rarely theirs to give.",
    patterns: [
      /\b(?:children|child|minors?|teens?|teenagers?)\b[^.]{0,80}\b(?:collect|information|data|personal)\b/i,
      /\bunder\s+(?:the\s+age\s+of\s+)?(?:13|16|18)\b/i,
      /\bparental\s+consent\b/i,
      /\bcoppa\b/i,
      /\byoung(?:er)?\s+users?\b/i,
    ],
    negativeGuards: [
      /\bdo\s+not\s+knowingly\s+collect\b/i,
      /\bnot\s+(?:intended|directed)\s+(?:for|to|at)\s+(?:children|anyone\s+under)\b/i,
    ],
  },
  {
    id: "business_transfer",
    category: "business_transfer",
    severity: "high",
    firewall: true,
    headline: "Your data is an asset they can sell with the company",
    plainEnglish: "In a merger, acquisition or bankruptcy your data transfers to whoever buys it, under whatever policy they write next.",
    patterns: [
      /\b(?:merger|acquisition|acquired|reorganization|restructuring)\b[^.]{0,100}\b(?:information|data|assets|transfer)\b/i,
      /\b(?:bankruptcy|insolvency|liquidation|receivership)\b/i,
      /\bsale\s+of\s+(?:all\s+or\s+(?:substantially\s+)?(?:a\s+portion|part)\s+of\s+)?(?:our\s+)?(?:assets|business)\b/i,
      /\b(?:successor|acquirer|purchaser)\s+(?:in\s+interest\s+)?(?:entity|company|organization)?\b[^.]{0,60}\b(?:information|data)\b/i,
      /\bbusiness\s+(?:transfer|transaction|combination)\b/i,
      /\btransferred\s+(?:as\s+)?(?:a\s+)?(?:business\s+)?asset\b/i,
    ],
  },
  {
    id: "contacts_harvest",
    category: "contacts_harvest",
    severity: "high",
    firewall: true,
    headline: "They can hoover up your contacts",
    plainEnglish: "Your address book is other people's data: they never agreed to this policy, and they are not asked.",
    patterns: [
      /\b(?:address\s+book|contact\s+list|contacts\s+list|phone\s+book)\b/i,
      /\byour\s+contacts\b/i,
      /\b(?:friends?|social)\s+(?:list|graph|connections|network)\b[^.]{0,60}\b(?:collect|import|upload|access|sync)\b/i,
      /\b(?:upload|import|sync|access)\b[^.]{0,50}\bcontacts?\b/i,
      /\bpeople\s+you\s+(?:may\s+)?know\b/i,
    ],
  },
  {
    id: "human_review",
    category: "human_review",
    severity: "high",
    firewall: true,
    headline: "Real people can read or listen to your content",
    plainEnglish: "Reviewers, moderators or contractors can open what you assumed only a machine would see.",
    patterns: [
      /\b(?:human|manual)\s+(?:review(?:ers?)?|annotat|listen|transcri)/i,
      /\breviewed\s+by\s+(?:our\s+)?(?:employees|staff|contractors|trained\s+(?:reviewers|specialists)|people|humans)\b/i,
      /\b(?:employees|contractors|service\s+providers|moderators)\b[^.]{0,80}\b(?:review|listen\s+to|read|access)\b[^.]{0,60}\b(?:your\s+)?(?:content|messages|recordings|conversations|audio)\b/i,
      /\b(?:voice|audio)\s+recordings?\b[^.]{0,80}\breview/i,
      /\bcontent\s+moderation\b/i,
    ],
  },
  {
    id: "silent_changes",
    category: "silent_changes",
    severity: "medium",
    firewall: false,
    headline: "They can rewrite this policy whenever they like",
    plainEnglish: "Terms you accepted today can be replaced tomorrow, and continuing to use the product counts as accepting the new ones.",
    patterns: [
      /\b(?:may|can|reserve\s+the\s+right\s+to)\s+(?:modify|change|update|amend|revise)\s+(?:this|our)\s+(?:privacy\s+)?(?:policy|notice|statement|terms)\b/i,
      /\b(?:change|update|modif\w+)\b[^.]{0,60}\bat\s+any\s+time\b/i,
      /\bfrom\s+time\s+to\s+time\b[^.]{0,80}\b(?:update|change|revise|amend)\b/i,
      /\bwithout\s+(?:prior\s+)?(?:notice|notifying\s+you)\b/i,
      /\breserve\s+the\s+right\b/i,
    ],
  },
  {
    id: "implied_consent",
    category: "implied_consent",
    severity: "medium",
    firewall: false,
    headline: "Just using the product counts as agreeing",
    plainEnglish: "You are treated as having consented by showing up, not by choosing anything.",
    patterns: [
      /\bby\s+(?:using|accessing|continuing\s+to\s+use|visiting)\b[^.]{0,80}\byou\s+(?:agree|consent|accept|acknowledge)\b/i,
      /\bcontinued\s+use\b[^.]{0,80}\b(?:constitutes|means|indicates|signifies)\b/i,
      /\b(?:deemed|considered)\s+to\s+have\s+(?:accepted|consented|agreed)\b/i,
      /\byour\s+continued\s+(?:use|access)\b/i,
      /\bimplied\s+consent\b/i,
    ],
  },
  {
    id: "dark_pattern_optout",
    category: "dark_pattern_optout",
    severity: "medium",
    firewall: false,
    headline: "The privacy-protecting choice is the one you have to go find",
    plainEnglish: "It is on by default and switching it off is a separate errand, if it is possible at all.",
    patterns: [
      /\b(?:may\s+not|cannot|can't|unable\s+to)\s+(?:be\s+able\s+to\s+)?opt\s*-?\s*out\b/i,
      /\bopt\s*-?\s*out\b[^.]{0,60}\b(?:does\s+not|will\s+not|won't)\b/i,
      /\bto\s+opt\s*-?\s*out[^.]{0,80}\b(?:visit|contact|email|write|submit|go\s+to)\b/i,
      /\bby\s+default\b[^.]{0,60}\b(?:enabled|on|collect|share)\b/i,
      /\byou\s+(?:will\s+)?(?:still|continue\s+to)\s+(?:see|receive|get)\b[^.]{0,40}\bads?\b/i,
    ],
  },
  {
    id: "security_vague",
    category: "security_vague",
    severity: "medium",
    firewall: false,
    headline: "The security promise is a shrug",
    plainEnglish: "\"Reasonable\" and \"industry-standard\" commit them to nothing specific and nothing testable.",
    patterns: [
      /\b(?:industry[\s-]standard|commercially\s+reasonable|reasonable|appropriate)\s+(?:technical\s+and\s+organizational\s+)?(?:security\s+)?(?:measures|safeguards|practices|controls|steps|precautions)\b/i,
      /\bno\s+(?:method|system|security\s+measure)\b[^.]{0,80}\b(?:100%|completely|entirely)?\s*(?:secure|guarantee)/i,
      /\bcannot\s+guarantee\b[^.]{0,60}\bsecurity\b/i,
      /\bat\s+your\s+own\s+risk\b/i,
    ],
  },
  {
    id: "vague_euphemism",
    category: "vague_euphemism",
    severity: "medium",
    firewall: true,
    headline: "The wording is broad enough to cover almost anything",
    plainEnglish: "Open-ended phrasing like this is a permission slip: it names no limit you could hold them to.",
    patterns: [
      /\bincluding,?\s+but\s+not\s+limited\s+to\b/i,
      /\bsuch\s+as,?\s+(?:but\s+not\s+limited\s+to|among\s+other)/i,
      /\b(?:other|certain)\s+(?:legitimate\s+)?business\s+purposes?\b/i,
      /\blegitimate\s+interests?\b/i,
      /\b(?:improve|enhance|personalize|tailor|optimize)\b[^.]{0,40}\b(?:our\s+services|your\s+experience|the\s+services)\b/i,
      /\bas\s+(?:otherwise\s+)?(?:permitted|required)\s+by\s+(?:applicable\s+)?law\b/i,
      /\band\s+similar\s+(?:technologies|purposes|entities)\b/i,
      /\bany\s+other\s+purpose\b/i,
    ],
  },
];

const VAGUE_MARKERS = [
  /\bmay\b/i, /\bincluding\s+but\s+not\s+limited\s+to\b/i, /\bsuch\s+as\b/i,
  /\bcertain\b/i, /\bfrom\s+time\s+to\s+time\b/i, /\bother\b/i, /\bgenerally\b/i,
  /\bamong\s+other\s+things\b/i, /\betc\b/i,
];

export function classifySpecificity(sentence: string): Specificity {
  return VAGUE_MARKERS.some((r) => r.test(sentence)) ? "vague" : "specific";
}

/** One flag per (category, sentence); the firewall gets the last word. */
export function runRules(sentences: Sentence[]): Flag[] {
  const flags: Flag[] = [];
  for (const sentence of sentences) {
    const negated = isNegated(sentence.text);
    const conditional = isConditional(sentence.text);
    for (const rule of RULES) {
      if (negated) continue;
      if (rule.firewall && conditional) continue;
      if (rule.negativeGuards?.some((r) => r.test(sentence.text))) continue;
      const hits = rule.patterns.filter((r) => r.test(sentence.text)).length;
      if (hits === 0) continue;
      flags.push({
        id: `${rule.category}:${sentence.start}`,
        category: rule.category,
        severity: rule.severity,
        score: Math.min(1, 0.6 + 0.1 * hits),
        headline: rule.headline,
        plainEnglish: rule.plainEnglish,
        quote: sentence.text,
        start: sentence.start,
        end: sentence.end,
        specificity: classifySpecificity(sentence.text),
        source: "rule",
      });
    }
  }
  return flags;
}
