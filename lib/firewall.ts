// The conditionality firewall.
//
// Product principle 2: bias to false negatives. A privacy policy is full of
// sentences that describe a scary-sounding capability only to deny it, gate it
// behind your explicit consent, or attribute it to a court order. Those are not
// red flags, and flagging them is the fastest way to lose a reader's trust.
// This module over-suppresses on purpose.

/** "We do NOT sell..." — the capability is being denied. */
export const NEGATION_GUARDS: RegExp[] = [
  /\bwe\s+(?:do|does|did)\s+not\b/i,
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
];

/** Compelled disclosure — a legal obligation, not a business choice. */
export const LEGAL_PROCESS_GUARDS: RegExp[] = [
  /\blaw\s+enforcement\b/i,
  /\blegal\s+(?:process|obligation|request|requirement|proceeding|claim|authority)\b/i,
  /\b(?:court|judicial)\s+(?:order|process|proceeding)\b/i,
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

const anyMatch = (guards: RegExp[], s: string) => guards.some((r) => r.test(s));

export const isNegated = (sentence: string) => anyMatch(NEGATION_GUARDS, sentence);
export const isLegalProcess = (sentence: string) => anyMatch(LEGAL_PROCESS_GUARDS, sentence);
export const isConsentGated = (sentence: string) => anyMatch(CONSENT_GUARDS, sentence);
export const isDefinitional = (sentence: string) => anyMatch(DEFINITIONAL_GUARDS, sentence);

/**
 * True when a sentence must not become a flag: it denies the capability, or
 * attributes it to legal compulsion, or gates it behind your own choice.
 */
export function isConditional(sentence: string): boolean {
  return (
    isNegated(sentence) ||
    isLegalProcess(sentence) ||
    isConsentGated(sentence) ||
    isDefinitional(sentence)
  );
}
