import { describe, expect, it } from "vitest";
import { pickSource } from "./scan-source";

const POLICY = "We may share your data with trusted partners.";
const LINK = "https://example.com/privacy";

describe("pickSource — the last-edited field wins", () => {
  it("F3: paste, then a link → the link is scanned", () => {
    expect(pickSource(POLICY, LINK, "url")).toEqual({ kind: "url", url: LINK });
  });

  it("F4: a link, then paste → the paste is scanned", () => {
    expect(pickSource(POLICY, LINK, "paste")).toEqual({ kind: "paste", text: POLICY });
  });

  it("falls back to the other field when the last-edited one was cleared", () => {
    expect(pickSource(POLICY, "", "url")).toEqual({ kind: "paste", text: POLICY });
    expect(pickSource("   \n", LINK, "paste")).toEqual({ kind: "url", url: LINK });
  });

  it("uses whichever field has content when nothing was edited yet", () => {
    expect(pickSource(POLICY, "", null)).toEqual({ kind: "paste", text: POLICY });
    expect(pickSource("", LINK, null)).toEqual({ kind: "url", url: LINK });
  });

  it("returns nothing when both fields are blank", () => {
    expect(pickSource("", "  ", "url")).toBeNull();
    expect(pickSource(" ", "", null)).toBeNull();
  });

  it("trims the link but sends the pasted text untouched", () => {
    expect(pickSource("", `  ${LINK} `, "url")).toEqual({ kind: "url", url: LINK });
    expect(pickSource(` ${POLICY}\n`, "", "paste")).toEqual({ kind: "paste", text: ` ${POLICY}\n` });
  });
});
