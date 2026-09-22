import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/scan", async () => {
  const actual = await vi.importActual<typeof import("@/lib/scan")>("@/lib/scan");
  return {
    ...actual,
    scan: vi.fn(async () => {
      throw new TypeError("something unexpected blew up inside the engine");
    }),
  };
});

import { POST, clientIp } from "@/app/api/scan/route";

const request = (headers: Record<string, string>, body: unknown = {}) =>
  new Request("https://redflags.test/api/scan", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

describe("clientIp", () => {
  it("takes the LAST x-forwarded-for entry — the one the proxy appended", () => {
    expect(clientIp(request({ "x-forwarded-for": "1.1.1.1, 9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("uses the only entry when the header has one", () => {
    expect(clientIp(request({ "x-forwarded-for": "9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("falls back to x-real-ip, then to unknown", () => {
    expect(clientIp(request({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
    expect(clientIp(request({}))).toBe("unknown");
  });
});

describe("catch-all error mapping", () => {
  it("returns 500 SCAN_FAILED when the engine throws something unexpected", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(request({ "x-forwarded-for": "203.0.113.7" }, { text: "x".repeat(400) }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "The scan failed unexpectedly.",
      code: "SCAN_FAILED",
      retryable: true,
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
