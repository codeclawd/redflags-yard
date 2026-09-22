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
