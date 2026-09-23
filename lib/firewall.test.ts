import { describe, expect, it } from "vitest";
import {
  CONSENT_GUARDS,
  LEGAL_PROCESS_GUARDS,
  NEGATION_GUARDS,
  isConditional,
  isConsentGated,
  isLegalProcess,
  isNegated,
} from "@/lib/firewall";

describe("the conditionality firewall", () => {
  it("F1 — suppresses a denial", () => {
    const s = "We do not sell your personal information to anyone.";
    expect(isNegated(s)).toBe(true);
    expect(isConditional(s)).toBe(true);
  });

  it("F1 — suppresses 'we have never sold'", () => {
    expect(isNegated("We have never sold your personal information and we never will.")).toBe(true);
  });

  it("F2 — suppresses compelled legal disclosure", () => {
    const s = "We disclose data to law enforcement when required by law.";
    expect(isLegalProcess(s)).toBe(true);
    expect(isConditional(s)).toBe(true);
  });

  it("F2 — suppresses subpoenas and court orders", () => {
    expect(isLegalProcess("We may share information in response to a valid court order or subpoena.")).toBe(true);
  });

  it("suppresses consent-gated sentences", () => {
    expect(isConsentGated("If you choose to enable location, we collect your precise location.")).toBe(true);
    expect(isConsentGated("We share this only with your express consent.")).toBe(true);
  });

  it("lets a plain permissive sentence through", () => {
    const s = "We may share your personal information with trusted partners for advertising.";
    expect(isNegated(s)).toBe(false);
    expect(isLegalProcess(s)).toBe(false);
    expect(isConsentGated(s)).toBe(false);
    expect(isConditional(s)).toBe(false);
  });

  it("lets 'we retain data indefinitely' through", () => {
    expect(isConditional("We retain your information indefinitely for business purposes.")).toBe(false);
  });

  it("exports its guard lists for inspection", () => {
    expect(NEGATION_GUARDS.length).toBeGreaterThan(5);
    expect(LEGAL_PROCESS_GUARDS.length).toBeGreaterThan(5);
    expect(CONSENT_GUARDS.length).toBeGreaterThan(5);
    for (const r of [...NEGATION_GUARDS, ...LEGAL_PROCESS_GUARDS, ...CONSENT_GUARDS]) {
      expect(r).toBeInstanceOf(RegExp);
    }
  });
});

// Reproduced by an independent reviewer on the live mozilla.org policy: the first flag
// shown was a Critical "follows you across other sites" quoting Mozilla's own denial.
describe("negation names the subject and the verb of every category", () => {
  const denials = [
    "Mozilla does not track users across third-party websites to provide targeted advertising.",
    "The service does not monitor your messages.",
    "We do not profile you for advertising.",
    "Zoom does not record meetings without the host's permission.",
    "The app will not access your contacts.",
    "We never train our models on your private files.",
  ];
  for (const s of denials) {
    it(`suppresses: ${s.slice(0, 60)}`, () => expect(isNegated(s)).toBe(true));
  }

  // F2 — widening the guard must not swallow a real admission.
  const admissions = [
    "We share data with partners who track you across other sites.",
    "We and our partners use cookies to track your activity across websites.",
    "We record your voice when you use the assistant.",
  ];
  for (const s of admissions) {
    it(`still flags: ${s.slice(0, 60)}`, () => expect(isNegated(s)).toBe(false));
  }
});

// A `\b` placed after a singular noun makes every plural miss: "legal obligations",
// "legal requests", "court orders" all slipped past the legal-process guard.
describe("legal-process and consent guards accept plurals and passive consent", () => {
  const legal = [
    "To comply with our legal obligations and defend our legal rights and commercial interests, and those of our affiliates.",
    "We may disclose information in response to legal requests.",
    "We share data when required by court orders.",
    "We retain data as needed to resolve legal claims.",
  ];
  for (const s of legal) it(`legal process: ${s.slice(0, 55)}`, () => expect(isLegalProcess(s)).toBe(true));

  it("consent: 'explicitly permitted by you' is consent-gated", () =>
    expect(isConsentGated("We use precise location data (where available and explicitly permitted by you).")).toBe(true));
});

// "You may choose whether or not you include sensitive personal information" is the
// reader's choice, not a collection. It led TikTok's "your face and voice" charge, so the
// strongest-looking click in the product opened on its weakest sentence.
describe("a choice the reader makes is not a practice", () => {
  it("suppresses 'you may choose whether or not you include…'", () =>
    expect(isConditional("You may choose whether or not you include sensitive personal information in your user content or in other information you voluntarily submit.")).toBe(true));
  it("still flags 'we may collect biometric identifiers'", () =>
    expect(isConditional("We may collect biometric identifiers and biometric information as defined under US laws, such as faceprints and voiceprints, from your user content.")).toBe(false));
});
