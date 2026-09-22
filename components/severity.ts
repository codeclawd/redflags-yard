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

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "No quarter",
  high: "Heavy",
  medium: "Noted",
  low: "Minor",
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
