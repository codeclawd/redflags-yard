import { describe, expect, it } from "vitest";
import {
  FetchFailure,
  assertPublicUrl,
  fetchPolicyText,
  isPrivateIpv4,
  isPrivateIpv6,
  pinnedLookup,
  type FetchFactory,
  type Resolver,
} from "@/lib/fetch-policy";

/** Never touches DNS. */
const fakeResolver = (address: string, family = 4): Resolver => async () => [{ address, family }];
const publicResolver = fakeResolver("93.184.216.34");

async function codeOf(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
    return "NO_ERROR";
  } catch (err) {
    if (err instanceof FetchFailure) return err.payload.code;
    throw err;
  }
}

describe("private range detection", () => {
  it.each([
    "10.0.0.1", "10.255.255.255", "172.16.0.1", "172.31.255.1", "192.168.1.1",
    "127.0.0.1", "127.1.2.3", "169.254.169.254", "0.0.0.0", "100.64.0.1",
    "224.0.0.1", "255.255.255.255", "192.0.0.1",
  ])("blocks %s", (ip) => expect(isPrivateIpv4(ip)).toBe(true));

  it.each(["8.8.8.8", "93.184.216.34", "1.1.1.1", "172.32.0.1", "172.15.0.1", "151.101.1.69"])(
    "allows %s",
    (ip) => expect(isPrivateIpv4(ip)).toBe(false),
  );

  it.each(["::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1"])(
    "blocks ipv6 %s",
    (ip) => expect(isPrivateIpv6(ip)).toBe(true),
  );

  it.each(["2606:4700:4700::1111", "2001:4860:4860::8888"])("allows ipv6 %s", (ip) =>
    expect(isPrivateIpv6(ip)).toBe(false),
  );

  it("treats malformed input as private", () => {
    expect(isPrivateIpv4("not-an-ip")).toBe(true);
    expect(isPrivateIpv4("1.2.3")).toBe(true);
    expect(isPrivateIpv4("999.1.1.1")).toBe(true);
  });
});

describe("assertPublicUrl — F6", () => {
  it("rejects a hostname that resolves into a private range, before connecting", async () => {
    expect(await codeOf(() => assertPublicUrl("http://evil.example.com/p", fakeResolver("10.0.0.1")))).toBe("BLOCKED_URL");
    expect(await codeOf(() => assertPublicUrl("http://evil.example.com/p", fakeResolver("169.254.169.254")))).toBe("BLOCKED_URL");
    expect(await codeOf(() => assertPublicUrl("http://evil.example.com/p", fakeResolver("::1", 6)))).toBe("BLOCKED_URL");
  });

  it("rejects bare private IP literals without consulting DNS", async () => {
    const explode: Resolver = async () => {
      throw new Error("DNS must not be consulted for an IP literal");
    };
    expect(await codeOf(() => assertPublicUrl("http://10.0.0.1/", explode))).toBe("BLOCKED_URL");
    expect(await codeOf(() => assertPublicUrl("http://169.254.169.254/latest/meta-data/", explode))).toBe("BLOCKED_URL");
    expect(await codeOf(() => assertPublicUrl("http://[::1]:8080/", explode))).toBe("BLOCKED_URL");
  });

  it("rejects localhost and internal suffixes", async () => {
    for (const u of ["http://localhost:3000/", "http://foo.localhost/", "http://db.internal/", "http://nas.local/"]) {
      expect(await codeOf(() => assertPublicUrl(u, publicResolver)), u).toBe("BLOCKED_URL");
    }
  });

  it("rejects non-http schemes", async () => {
    for (const u of ["file:///etc/passwd", "ftp://example.com/x", "gopher://example.com/", "data:text/html,hi"]) {
      expect(await codeOf(() => assertPublicUrl(u, publicResolver)), u).toBe("BLOCKED_URL");
    }
  });

  it("rejects junk that is not a URL", async () => {
    expect(await codeOf(() => assertPublicUrl("not a url at all", publicResolver))).toBe("INVALID_INPUT");
  });

  it("reports an unresolvable host as a fetch failure, not a block", async () => {
    const failing: Resolver = async () => {
      throw new Error("ENOTFOUND");
    };
    expect(await codeOf(() => assertPublicUrl("https://nope.example/", failing))).toBe("FETCH_FAILED");
  });

  it("allows a normal public https URL, and reports the validated addresses", async () => {
    const { url, addresses } = await assertPublicUrl("https://www.example.com/privacy", publicResolver);
    expect(url.hostname).toBe("www.example.com");
    expect(url.protocol).toBe("https:");
    expect(addresses).toEqual([{ address: "93.184.216.34", family: 4 }]);
  });

  it("blocks when any one of several resolved addresses is private", async () => {
    const mixed: Resolver = async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ];
    expect(await codeOf(() => assertPublicUrl("https://sneaky.example/", mixed))).toBe("BLOCKED_URL");
  });

  it("blocks a host that resolves to nothing", async () => {
    const empty: Resolver = async () => [];
    expect(await codeOf(() => assertPublicUrl("https://void.example/", empty))).toBe("BLOCKED_URL");
  });
});

describe("DNS-rebinding pin — the connection uses the address that was validated", () => {
  const page = (body: string) =>
    new Response(body, { status: 200, headers: { "content-type": "text/html" } });
  const policyHtml = `<html><body><article><p>${"We may share your personal information with our trusted partners. ".repeat(12)}</p></article></body></html>`;

  it("hands the first validated address to the fetch factory, not the hostname", async () => {
    const pins: Array<{ address: string; family: number }> = [];
    const factory: FetchFactory = (pin) => {
      pins.push(pin);
      return (async () => page(policyHtml)) as unknown as typeof fetch;
    };
    const out = await fetchPolicyText("https://policy.example/privacy", {
      resolve: fakeResolver("93.184.216.34"),
      fetchFactory: factory,
    });
    expect(pins).toEqual([{ address: "93.184.216.34", family: 4 }]);
    expect(out.finalUrl).toBe("https://policy.example/privacy");
  });

  it("re-validates AND re-pins on every redirect hop", async () => {
    const pins: Array<{ address: string; family: number }> = [];
    let hop = 0;
    const resolve: Resolver = async (hostname) =>
      hostname === "policy.example"
        ? [{ address: "93.184.216.34", family: 4 }]
        : [{ address: "151.101.1.69", family: 4 }];
    const factory: FetchFactory = (pin) => {
      pins.push(pin);
      return (async () =>
        hop++ === 0
          ? new Response(null, { status: 302, headers: { location: "https://second.example/p" } })
          : page(policyHtml)) as unknown as typeof fetch;
    };
    await fetchPolicyText("https://policy.example/privacy", { resolve, fetchFactory: factory });
    expect(pins).toEqual([
      { address: "93.184.216.34", family: 4 },
      { address: "151.101.1.69", family: 4 },
    ]);
  });

  it("refuses a redirect to a rebound private address", async () => {
    const resolve: Resolver = async (hostname) =>
      hostname === "policy.example"
        ? [{ address: "93.184.216.34", family: 4 }]
        : [{ address: "169.254.169.254", family: 4 }];
    const factory: FetchFactory = () =>
      (async () =>
        new Response(null, { status: 302, headers: { location: "http://metadata.example/latest" } })) as unknown as typeof fetch;
    expect(
      await codeOf(() => fetchPolicyText("https://policy.example/privacy", { resolve, fetchFactory: factory })),
    ).toBe("BLOCKED_URL");
  });

  it("pinnedLookup can only answer with the validated address", () => {
    const seen: unknown[] = [];
    pinnedLookup({ address: "93.184.216.34", family: 4 })("policy.example", {}, (err, addresses) => {
      seen.push(err, addresses);
    });
    expect(seen[0]).toBeNull();
    expect(seen[1]).toEqual([{ address: "93.184.216.34", family: 4 }]);
  });
});
