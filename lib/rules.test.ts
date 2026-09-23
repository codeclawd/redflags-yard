import { describe, expect, it } from "vitest";
import { RULES, SEVERITY_BY_CATEGORY, classifySpecificity, runRules } from "@/lib/rules";
import type { CategoryId } from "@/lib/types";
import { splitSentences } from "@/lib/text";

const run = (sentence: string) => runRules(splitSentences(sentence));
const categoriesOf = (sentence: string) => new Set(run(sentence).map((f) => f.category));

/** Each category gets a sentence that must flag and one the firewall must kill. */
const FIXTURES: Record<Exclude<CategoryId, "vague_euphemism">, { positive: string; suppressed: string }> = {
  sells_shares: {
    positive: "We sell your personal information to third parties in exchange for valuable consideration every month.",
    suppressed: "We do not sell your personal information to third parties for money or anything else.",
  },
  cross_site_tracking: {
    positive: "We track your activity across other websites and apps using device fingerprinting technology today.",
    suppressed: "We do not track your activity across other websites and apps at any point in time.",
  },
  biometric_sensitive: {
    positive: "We collect biometric identifiers including faceprints and voiceprints from the videos that you upload.",
    suppressed: "We do not collect biometric identifiers such as faceprints or voiceprints from your uploads.",
  },
  precise_location: {
    positive: "We collect your precise geolocation using GPS whenever the application is running in the background.",
    suppressed: "If you choose to enable it, we collect your precise geolocation using GPS on your device.",
  },
  ai_training: {
    positive: "We use the content that you post to train our machine learning models and artificial intelligence systems.",
    suppressed: "We do not use the content that you post to train our machine learning models or algorithms.",
  },
  affiliate_sharing: {
    positive: "We share your information with our affiliates and with trusted partners across our corporate family.",
    suppressed: "We never share your information with our affiliates or with any third-party business partners.",
  },
  no_deletion: {
    positive: "We retain your personal information indefinitely and copies may remain in our backups after you delete it.",
    suppressed: "We do not retain your personal information indefinitely once your account has been closed.",
  },
  perpetual_license: {
    positive: "You grant us a perpetual, irrevocable, worldwide, royalty-free and sublicensable licence to your content.",
    suppressed: "We will not claim a perpetual or irrevocable licence to your content under any circumstances.",
  },
  arbitration: {
    positive: "You agree to binding arbitration and you waive your right to a jury trial and to any class action.",
    suppressed: "We do not require binding arbitration and we will never ask you to waive a jury trial.",
  },
  childrens_data: {
    positive: "We collect personal information from children under the age of 13 with verifiable parental consent forms.",
    suppressed: "We do not knowingly collect personal information from children under the age of 13 online.",
  },
  business_transfer: {
    positive: "In a merger, acquisition or bankruptcy your personal information may be transferred as a business asset.",
    suppressed: "We will not transfer your personal information in a merger or acquisition of our business.",
  },
  contacts_harvest: {
    positive: "We upload your address book and your contact list so that we can suggest people you may know.",
    suppressed: "We do not upload your address book or your contact list from your mobile device, ever.",
  },
  human_review: {
    positive: "Trained human reviewers listen to your voice recordings and read the messages you send on the platform.",
    suppressed: "We do not allow human reviewers to listen to your voice recordings or read your messages.",
  },
  silent_changes: {
    positive: "We reserve the right to change this privacy policy at any time without prior notice to you.",
    suppressed: "We will not change this privacy policy at any time without giving you advance notice first.",
  },
  implied_consent: {
    positive: "By using the Services you agree to this policy, and your continued use constitutes ongoing acceptance.",
    suppressed: "We do not treat your continued use as consent, and we will never deem you to have agreed.",
  },
  dark_pattern_optout: {
    positive: "You may not be able to opt out of certain sharing, and you will still see advertisements regardless.",
    suppressed: "We do not prevent you from opting out, and you cannot be forced to see targeted advertisements.",
  },
  security_vague: {
    positive: "We use commercially reasonable security measures, but no method of transmission is completely secure.",
    suppressed: "We do not rely on reasonable security measures alone and cannot guarantee anything less.",
  },
};

describe("the rule table", () => {
  // 17, not 18: vague_euphemism is decoder-only by design (see lib/rules.ts).
  it("covers all 17 flagging categories with at least 2 patterns each", () => {
    const ids = new Set(RULES.map((r) => r.category));
    expect(ids.size).toBe(17);
    expect(ids.has("vague_euphemism" as never)).toBe(false);
    expect(Object.keys(SEVERITY_BY_CATEGORY)).toHaveLength(18);
    for (const rule of RULES) {
      expect(rule.patterns.length, rule.id).toBeGreaterThanOrEqual(2);
      expect(rule.headline.length, rule.id).toBeGreaterThan(10);
      expect(rule.plainEnglish.length, rule.id).toBeGreaterThan(20);
      expect(rule.severity).toBe(SEVERITY_BY_CATEGORY[rule.category]);
    }
  });

  it("has a unique rule id per category", () => {
    expect(new Set(RULES.map((r) => r.id)).size).toBe(RULES.length);
  });
});

describe("every category flags its positive fixture", () => {
  for (const [category, fixture] of Object.entries(FIXTURES) as [CategoryId, { positive: string }][]) {
    it(category, () => {
      expect([...categoriesOf(fixture.positive)]).toContain(category);
    });
  }
});

describe("the firewall suppresses every category's negative fixture", () => {
  for (const [category, fixture] of Object.entries(FIXTURES) as [CategoryId, { suppressed: string }][]) {
    it(category, () => {
      expect([...categoriesOf(fixture.suppressed)]).not.toContain(category);
    });
  }
});

describe("runRules output shape", () => {
  it("F2 — a law-enforcement sentence produces no flags at all", () => {
    expect(run("We disclose your personal information to law enforcement when required by law.")).toHaveLength(0);
  });

  it("scores by how many patterns hit, capped at 1", () => {
    const flags = run(FIXTURES.cross_site_tracking.positive);
    for (const f of flags) {
      expect(f.score).toBeGreaterThanOrEqual(0.6);
      expect(f.score).toBeLessThanOrEqual(1);
    }
  });

  it("uses a stable id and a verbatim quote", () => {
    const text = FIXTURES.sells_shares.positive;
    for (const f of run(text)) {
      expect(f.id).toBe(`${f.category}:${f.start}`);
      expect(text.slice(f.start, f.end)).toBe(f.quote);
      expect(f.source).toBe("rule");
    }
  });

  it("marks hedged wording as vague", () => {
    expect(classifySpecificity("We may share certain information with other companies.")).toBe("vague");
    expect(classifySpecificity("We retain your email address for seven years.")).toBe("specific");
  });
});

// "\bprecise" matched inside "non-precise" (the hyphen is a word boundary), so Spotify's
// "non-precise location data (e.g., country or region, city, state)" was flagged Critical
// as "they can pinpoint exactly where you are": the opposite of what it says.
describe("precise location is not matched inside 'non-precise'", () => {
  const cat = (text: string) => runRules(splitSentences(text)).map((f) => f.category);
  it("does not flag non-precise location", () =>
    expect(cat("This includes mapping IP addresses to non-precise location data (e.g., country or region, city, state).")).not.toContain("precise_location"));
  it("still flags precise location", () =>
    expect(cat("We collect your precise location from your device whenever the app is open.")).toContain("precise_location"));
});

describe("legal process still suppresses a disclosure", () => {
  it("does not flag sharing done to meet legal obligations", () => {
    const text = "To comply with our legal obligations and defend our legal rights and commercial interests, and those of our affiliates, users, and the public.";
    expect(runRules(splitSentences(text)).map((f) => f.category)).not.toContain("affiliate_sharing");
  });
});
