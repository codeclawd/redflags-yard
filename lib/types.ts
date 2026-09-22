// Shared contract for the Red Flags engine, API and UI. Locked by the plan
// (.planning/2026-09-21-redflags-yard3-one-screen.md); change it there first.

export type Severity = "critical" | "high" | "medium" | "low";
export type Source = "rule" | "lexicon" | "llm";
export type Specificity = "specific" | "vague";

export type CategoryId =
  | "sells_shares"          // critical — sells/shares personal data for value
  | "cross_site_tracking"   // critical — tracks across sites/apps/devices, fingerprinting, data brokers
  | "biometric_sensitive"   // critical — biometrics, health, sexual orientation, religion, genetic
  | "precise_location"      // critical — precise/GPS location, location history, background location
  | "ai_training"           // critical — uses your content/data to train models
  | "affiliate_sharing"     // critical — shares with "affiliates"/"corporate family"/"partners" undefined
  | "no_deletion"           // high — indefinite retention, can't delete, keeps after deletion
  | "perpetual_license"     // high — perpetual/irrevocable/worldwide licence to your content
  | "arbitration"           // high — forced arbitration, class-action/jury waiver
  | "childrens_data"        // high — collects from minors
  | "business_transfer"     // high — data is an asset in merger/sale/bankruptcy
  | "contacts_harvest"      // high — uploads address book / contacts / social graph
  | "human_review"          // high — humans read your messages/recordings/content
  | "silent_changes"        // medium — policy changes at any time / without notice
  | "implied_consent"       // medium — consent by continuing to use / by using
  | "dark_pattern_optout"   // medium — opt-out only, buried controls, "may not be able to opt out"
  | "security_vague"        // medium — "industry-standard"/"reasonable" security, no commitment
  | "vague_euphemism";      // medium/low — the decoder-ring catch-all

export interface Flag {
  id: string;               // stable: `${category}:${start}`
  category: CategoryId;
  severity: Severity;
  score: number;            // 0..1 within tier
  headline: string;         // verdict voice: "They can sell your data to advertisers"
  plainEnglish: string;     // one line, "what this means for you"
  quote: string;            // VERBATIM substring of source. Non-negotiable.
  start: number;            // char offset of quote in source text
  end: number;
  specificity: Specificity;
  source: Source;
  decoded?: { phrase: string; meaning: string }; // set when a lexicon hit produced/enriched the flag
}

export interface DecodedPhrase {
  phrase: string;           // canonical display form, e.g. "trusted partners"
  meaning: string;          // ≤120 chars, what it actually permits
  category: CategoryId;
  severity: Severity;
  count: number;
  positions: Array<[number, number]>; // offsets in source
}

export type Rank = "Honest merchant" | "Smuggler" | "Privateer" | "Pirate" | "Ghost ship";

export interface ScanScore {
  value: number;            // 0..100, higher = worse for you
  grade: "A" | "B" | "C" | "D" | "F";
  rank: Rank;
}

export interface ScanMeta {
  sourceChars: number;
  sentenceCount: number;
  ruleCount: number;
  lexiconCount: number;
  llmCount: number;
  llm: "ran" | "skipped:no-key" | "skipped:test" | "skipped:timeout" | "skipped:rate-limit" | "skipped:error";
  ms: number;
  policyId?: string;
}

export interface ScanResult {
  flags: Flag[];            // ranked: severity desc, then score desc, then start asc
  decoder: DecodedPhrase[]; // ranked by severity desc, count desc
  score: ScanScore;
  meta: ScanMeta;
}

export type ScanErrorCode =
  | "INVALID_INPUT" | "FETCH_FAILED" | "BLOCKED_URL" | "NOT_HTML"
  | "EMPTY_CONTENT" | "CONTENT_TOO_LARGE" | "RATE_LIMITED";

export interface ScanError { error: string; code: ScanErrorCode; retryable: boolean }
