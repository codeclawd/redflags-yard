import {
  Anchor,
  Baby,
  Coins,
  Crown,
  Database,
  EyeOff,
  Fingerprint,
  Globe,
  Handshake,
  Hourglass,
  ScanEye,
  ScrollText,
  Share2,
  ShieldAlert,
  Ship,
  Siren,
  Swords,
  Telescope,
  type LucideIcon,
} from "lucide-react";
import type { CategoryId, Severity } from "@/lib/types";

export const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "var(--color-blood)",
  high: "var(--color-ember)",
  medium: "var(--color-gold)",
  low: "var(--color-amber-dim)",
};

// Severity is the one label a reader has to be able to rank at a glance, so it
// says what it is. The colour carries the world; the word carries the meaning.
export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const CATEGORY_ICON: Record<CategoryId, LucideIcon> = {
  sells_shares: Coins,
  cross_site_tracking: ScanEye,
  biometric_sensitive: Fingerprint,
  precise_location: Globe,
  ai_training: Database,
  affiliate_sharing: Handshake,
  no_deletion: Hourglass,
  perpetual_license: Crown,
  arbitration: Swords,
  childrens_data: Baby,
  business_transfer: Ship,
  contacts_harvest: Share2,
  human_review: EyeOff,
  silent_changes: ScrollText,
  implied_consent: Anchor,
  dark_pattern_optout: ShieldAlert,
  security_vague: Siren,
  vague_euphemism: Telescope,
};

export const CATEGORY_LABEL: Record<CategoryId, string> = {
  sells_shares: "Sells or shares you",
  cross_site_tracking: "Follows you off-site",
  biometric_sensitive: "Sensitive and biometric",
  precise_location: "Precise location",
  ai_training: "Trains models on you",
  affiliate_sharing: "Unnamed recipients",
  no_deletion: "Cannot be deleted",
  perpetual_license: "Perpetual licence",
  arbitration: "Forced arbitration",
  childrens_data: "Children's data",
  business_transfer: "Sold with the company",
  contacts_harvest: "Harvests your contacts",
  human_review: "Humans read it",
  silent_changes: "Changes without notice",
  implied_consent: "Consent by using",
  dark_pattern_optout: "Opt-out only",
  security_vague: "Vague security",
  vague_euphemism: "Euphemism",
};

/** What the company is "wanted for taking", in the reader's words. Short enough for a poster line. */
export const CATEGORY_CHARGE: Record<CategoryId, string> = {
  sells_shares: "your data, to sell",
  cross_site_tracking: "what you do on other sites",
  biometric_sensitive: "your face and voice",
  precise_location: "where you are",
  ai_training: "your words to train AI",
  affiliate_sharing: "your data, for unnamed companies",
  no_deletion: "your data, for good",
  perpetual_license: "the rights to your posts",
  arbitration: "your right to sue",
  childrens_data: "your kids' data",
  business_transfer: "you, as a company asset",
  contacts_harvest: "your contacts",
  human_review: "your messages, read by staff",
  silent_changes: "the right to change the deal",
  implied_consent: "your consent, by default",
  dark_pattern_optout: "your yes, unless you opt out",
  security_vague: "no real security promise",
  vague_euphemism: "the benefit of the doubt",
};

/** The most severe distinct charges, in the engine's ranked order (flags arrive worst first). */
export function topCharges(flags: readonly { category: CategoryId }[], max = 4): string[] {
  const seen = new Set<CategoryId>();
  for (const flag of flags) {
    if (flag.category !== "vague_euphemism") seen.add(flag.category);
    if (seen.size === max) break;
  }
  if (seen.size === 0 && flags.length > 0) seen.add(flags[0].category);
  return [...seen].map((category) => CATEGORY_CHARGE[category]);
}
