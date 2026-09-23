// The conditionality firewall.
//
// Product principle 2: bias to false negatives. A privacy policy is full of
// sentences that describe a scary-sounding capability only to deny it, gate it
// behind your explicit consent, or attribute it to a court order. Those are not
// red flags, and flagging them is the fastest way to lose a reader's trust.
// This module over-suppresses on purpose.

/** Actions the rules accuse a company of. A denial of any of them is not a finding. */
const HARM_VERBS = [
  "track", "monitor", "profile", "target", "combine", "link", "record", "store", "keep",
  "access", "read", "listen", "scan", "analy[sz]e", "train", "transfer", "buy", "license",
  "infer", "fingerprint", "sell", "share", "disclose", "rent", "trade", "use", "collect",
  "retain", "process", "log", "save",
].join("|");

/** "We do NOT sell..." — the capability is being denied. */
export const NEGATION_GUARDS: RegExp[] = [
  /\bwe\s+(?:do|does|did)\s+not\b/i,
  // A policy often names itself instead of saying "we": "Spotify does not carry out..."
  /\b(?:do|does)\s+not\s+(?:carry\s+out|engage\s+in|perform|conduct)\b/i,
  /\bwe\s+(?:don't|won't|will\s+not|would\s+not|cannot|can't|never)\b/i,
  /\bwe\s+have\s+(?:not|never)\b/i,
  /\bwe\s+(?:no\s+longer|neither)\b/i,
  /\b(?:is|are|was|were)\s+not\s+(?:sold|shared|disclosed|used|collected|rented|retained)\b/i,
  /\bnot\s+(?:sell|share|disclose|rent|trade|use|collect|retain)\b/i,
  /\bwithout\s+(?:selling|sharing|disclosing)\b/i,
  /\bnever\s+(?:sell|share|sold|shared|disclose|disclosed|rent|rented)\b/i,
  /\bdoes\s+not\s+(?:sell|share|disclose|rent|trade|permit|allow)\b/i,
  /\bno\s+(?:sale|sales)\s+of\b/i,
  /\bprohibit(?:s|ed)?\s+from\b/i,
  /\bwe\s+will\s+not\b/i,
  // Subject-agnostic, over the harm verbs of every category. The guards above name
  // "we" or name the verb; a policy that names ITSELF ("Mozilla does not track...")
  // with a verb outside that list slipped through and was flagged Critical for the
  // exact thing it denies. The verb list is the set of actions the rules accuse.
  new RegExp(
    String.raw`\b(?:do|does|did|will|would|shall|may)\s+not\s+(?:${HARM_VERBS})\b`,
    "i",
  ),
  new RegExp(String.raw`\bnever\s+(?:${HARM_VERBS})\b`, "i"),
];

/** Compelled disclosure — a legal obligation, not a business choice. */
export const LEGAL_PROCESS_GUARDS: RegExp[] = [
  /\blaw\s+enforcement\b/i,
  // Plural-safe: a \b after the singular made \"legal obligations\" and \"legal claims\" miss.
  /\blegal\s+(?:process(?:es)?|obligations?|requests?|requirements?|proceedings?|claims?|authorit(?:y|ies))\b/i,
  /\b(?:court|judicial)\s+(?:orders?|process(?:es)?|proceedings?)\b/i,
  /\bsubpoena|warrant|summons\b/i,
  /\brequired\s+(?:by|under)\s+(?:law|applicable\s+law|regulation)\b/i,
  /\bcompelled\s+(?:by|to)\b/i,
  /\bgovernment(?:al)?\s+(?:agenc|authorit|request|body|entit)/i,
  /\b(?:regulatory|regulator|tax)\s+(?:authorit|agenc|request)/i,
  /\bin\s+response\s+to\s+(?:a\s+)?(?:valid\s+)?(?:legal|lawful|court)/i,
  /\bnational\s+security\b/i,
  /\bprevent\s+(?:fraud|harm|imminent)|detect(?:ing)?\s+(?:fraud|abuse)|investigat\w*\s+(?:fraud|abuse|violations)/i,
  /\bprotect\s+the\s+(?:rights|safety|vital\s+interests)\b/i,
  /\bterrorism|child\s+(?:sexual\s+)?(?:abuse|exploitation)|illegal\s+content\b/i,
];

/** Gated behind an affirmative act you take. */
export const CONSENT_GUARDS: RegExp[] = [
  /\b(?:with|upon|subject\s+to)\s+your\s+(?:express|explicit|prior|affirmative|separate)?\s*consent\b/i,
  /\byou\s+(?:have\s+)?(?:consent|consented|opt(?:ed)?\s*-?\s*in|agree(?:d)?\s+in\s+advance)\b/i,
  /\bif\s+you\s+(?:choose|elect|decide|opt|enable|turn\s+on|permit|allow|request|ask)\b/i,
  /\bwhen\s+you\s+(?:choose|elect|enable|turn\s+on|explicitly)\b/i,
  /\bonly\s+(?:with|if\s+you|when\s+you|after\s+you)\b/i,
  /\bat\s+your\s+(?:direction|request|option)\b/i,
  /\byou\s+(?:can|may)\s+(?:turn\s+(?:it\s+)?off|disable|revoke|withdraw|delete|decline|refuse)\b/i,
  /\bwith\s+your\s+permission\b/i,
  // Passive voice: \"where available and explicitly permitted by you\".
  /\b(?:explicitly\s+|expressly\s+)?(?:permitted|allowed|authori[sz]ed|enabled|approved)\s+by\s+you\b/i,
  /\bopt\s*-?\s*in\b/i,
];

/** Definitions, examples and rights sections that quote a capability. */
export const DEFINITIONAL_GUARDS: RegExp[] = [
  /\byou\s+have\s+the\s+right\s+to\b/i,
  /\byou\s+may\s+(?:request|exercise|submit)\b/i,
  /\b(?:means|is\s+defined\s+as|refers\s+to)\s+(?:the\s+)?(?:process|act|sharing|selling)/i,
  /\bwe\s+(?:offer|provide|give)\s+you\s+(?:the\s+)?(?:choice|control|tools|settings)\b/i,
  /\bto\s+(?:learn|find\s+out)\s+more\b/i,
];

/**
 * The company limiting itself, or cleaning up after itself. An age gate, a
 * promise to delete what it should not have collected, a default that is off,
 * a parental-controls section: these are the opposite of the harm the rule is
 * hunting for, and flagging them reads as not having understood the sentence.
 */
export const PROTECTIVE_GUARDS: RegExp[] = [
  // Shielding something from the company itself: DuckDuckGo "engineered a solution to
  // shield your precise location from us" was flagged Critical for tracking location.
  /\b(?:shield|protect|hide|mask|obscure|withhold)\s+[^.]{0,50}?\bfrom\s+(?:us|ourselves|our\b)/i,
  /\b(?:are|is)\s+not\s+(?:permitted|allowed|eligible)\s+to\b/i,
  /\bmay\s+not\s+(?:use|register|create\s+an\s+account)\b/i,
  /\bif\s+(?:we|you)\s+(?:learn|become\s+aware|discover|find\s+out)\b/i,
  /\b(?:take\s+reasonable\s+steps\s+to|promptly|immediately)\s+(?:delete|remove)\b/i,
  /\bwe(?:'ll|\s+will)\s+(?:promptly\s+)?(?:delete|remove|terminate)\b/i,
  /\bparent\s+or\s+guardian\b/i,
  /\bturned\s+off\s+by\s+default\b/i,
  /\bwe\s+(?:may\s+)?(?:also\s+)?limit\s+(?:how|what|the\s+(?:information|data))\b/i,
  /\b(?:additional|extra|special)\s+(?:protections?|safeguards?)\b/i,
];

/**
 * A sentence about a control you operate, or a pointer to where the real
 * detail lives. "You can opt out", "see our cookie policy", "click Settings":
 * these describe the escape hatch, not the trap.
 */
export const USER_CONTROL_GUARDS: RegExp[] = [
  // The reader's own choice, not a practice: "You may choose whether or not you include
  // sensitive personal information in your user content". Narrow on purpose ("whether"),
  // so "you may choose to share X, which we then sell" is not swallowed.
  /\byou\s+(?:may|can)\s+choose\s+whether\b/i,
  /\byou\s+(?:can|may)\s+(?:opt\s*-?\s*out|turn\s+off|disable|manage|control|adjust|change|limit|review|access|download|delete)\b/i,
  /\bif\s+you\s+turn\s+(?:off|these\s+settings)\b/i,
  /\b(?:cookie|privacy|ad(?:vertising)?|account)\s+settings\b/i,
  /\bopt\s*-?\s*out\s+(?:of|from)\b.{0,40}\b(?:by|at|through|using|clicking|visiting)\b/i,
  /\bsee\s+(?:our|the)\b[^.]{0,60}\b(?:policy|statement|notice|guide|page|centre|center)\b/i,
  /\bfor\s+more\s+information\b[^.]{0,40}\b(?:see|visit|read|click|refer)\b/i,
  /\b(?:learn|read)\s+more\s+(?:about|at|in|here)\b/i,
  /\byou\s+have\s+(?:choices|controls|options)\b/i,
];

/**
 * A glossary entry or a hypothetical, not a practice. Policies define their
 * terms ("An affiliate is an entity that...", "Sensitive personal information
 * is a category of...") and float futures they have not adopted ("if we were
 * to change that, we would tell you"). Both quote the scary noun without
 * asserting the company does the thing.
 */
export const GLOSSARY_GUARDS: RegExp[] = [
  /\b(?:an?|the)\s+[a-z][\w\s-]{0,24}\s+is\s+(?:an?|the)\s+(?:entity|category|term|company|business|process|feature|technology)\b/i,
  /\bthis\s+is\s+(?:a|an)\s+(?:particular\s+)?(?:category|type|kind|class)\s+of\b/i,
  /\bconsists?\s+of\s+(?:different\s+)?(?:subsidiaries|entities|companies)\b/i,
  /\bkey\s+terms?\b/i,
  /\bis\s+defined\s+(?:as|in|under)\b/i,
  /\bfor\s+example,?\s+(?:a|an|the)\b[^.]{0,30}\bis\b/i,
  /\bif\s+we\s+were\s+to\b/i,
  /\bwe\s+would\s+(?:disclose|tell|notify|inform|let\s+you)\b/i,
  /\bit(?:'s|\s+is)\s+your\s+choice\b/i,
  /\bdepending\s+on\s+(?:these|your)\s+settings\b/i,
  /\byou\s+can\s+change\s+your\s+(?:permissions|settings|preferences)\b/i,
];

/**
 * The sentence is about the law, or about a rule the company follows, rather
 * than about something it does to you. Naming what the CCPA classifies as
 * sensitive is not a confession of collecting it, and "we follow the
 * Self-Regulatory Principles" is a commitment, not a practice.
 */
export const STATUTORY_GUARDS: RegExp[] = [
  /\b(?:CCPA|CPRA|GDPR|VCDPA|HIPAA|COPPA|LGPD|PIPEDA|FERPA)\b/,
  /\b(?:as\s+)?defined\s+(?:under|by|in)\s+(?:the\s+|applicable\s+)?(?:state|federal|local|privacy|data\s+protection)?\s*laws?\b/i,
  /\bstate\s+privacy\s+laws?\b/i,
  /\bhave\s+identified\s+as\b/i,
  /\bself-?\s?regulatory\s+principles?\b/i,
  /\bwe\s+(?:follow|adhere\s+to|are\s+certified\s+under)\s+the\b/i,
  /\bprivacy\s+(?:framework|shield)\b/i,
  /\bnot\s+be\s+subject\s+to\b/i,
];

const anyMatch = (guards: RegExp[], s: string) => guards.some((r) => r.test(s));

export const isNegated = (sentence: string) => anyMatch(NEGATION_GUARDS, sentence);
export const isLegalProcess = (sentence: string) => anyMatch(LEGAL_PROCESS_GUARDS, sentence);
export const isConsentGated = (sentence: string) => anyMatch(CONSENT_GUARDS, sentence);
export const isDefinitional = (sentence: string) => anyMatch(DEFINITIONAL_GUARDS, sentence);
export const isProtective = (sentence: string) => anyMatch(PROTECTIVE_GUARDS, sentence);
export const isUserControl = (sentence: string) => anyMatch(USER_CONTROL_GUARDS, sentence);
export const isGlossary = (sentence: string) => anyMatch(GLOSSARY_GUARDS, sentence);
export const isStatutory = (sentence: string) => anyMatch(STATUTORY_GUARDS, sentence);

/**
 * True when a sentence must not become a flag: it denies the capability, or
 * attributes it to legal compulsion, or gates it behind your own choice.
 */
/**
 * Categories where a legal reason does not excuse the practice. The legal-process
 * guard exists for compelled DISCLOSURE ("we share with police when required by law").
 * Keeping your data "to defend legal claims" is still keeping it.
 */
export const LEGAL_REASON_STILL_HARMS: ReadonlySet<string> = new Set(["no_deletion"]);

export function isConditional(sentence: string, category?: string): boolean {
  const legalExcuses = !(category && LEGAL_REASON_STILL_HARMS.has(category));
  return (
    isNegated(sentence) ||
    (legalExcuses && isLegalProcess(sentence)) ||
    isConsentGated(sentence) ||
    isDefinitional(sentence) ||
    isProtective(sentence) ||
    isUserControl(sentence) ||
    isGlossary(sentence) ||
    isStatutory(sentence)
  );
}
