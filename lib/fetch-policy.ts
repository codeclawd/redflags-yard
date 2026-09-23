// Fetch a policy from a URL. Everything here is about not becoming an SSRF
// proxy: the hostname is resolved and every resolved address is checked against
// the private ranges BEFORE a socket is opened, and again on every redirect.

import { lookup } from "node:dns/promises";
import { Agent, fetch as undiciFetch } from "undici";
import type { ScanError } from "@/lib/types";

export const FETCH_TIMEOUT_MS = 8_000;
export const MAX_BYTES = 2 * 1024 * 1024;
export const MAX_REDIRECTS = 3;

export class FetchFailure extends Error {
  constructor(readonly payload: ScanError) {
    super(payload.error);
    this.name = "FetchFailure";
  }
}

const blocked = (error: string): FetchFailure =>
  new FetchFailure({ error, code: "BLOCKED_URL", retryable: false });

/** Resolver seam so the guard can be unit-tested without touching the network. */
export type Resolver = (hostname: string) => Promise<Array<{ address: string; family: number }>>;

const realResolver: Resolver = async (hostname) => {
  const all = await lookup(hostname, { all: true, verbatim: true });
  return all.map((a) => ({ address: a.address, family: a.family }));
};

export function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 0) return true;                       // 0.0.0.0/8
  if (a === 10) return true;                      // 10/8
  if (a === 127) return true;                     // loopback
  if (a === 169 && b === 254) return true;        // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true;        // 192.168/16
  if (a === 192 && b === 0) return true;          // 192.0.0/24, 192.0.2/24
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true;                      // multicast + reserved + broadcast
  return false;
}

export function isPrivateIpv6(ip: string): boolean {
  const s = ip.toLowerCase().split("%")[0];
  if (s === "::" || s === "::1") return true;
  if (s.startsWith("fe8") || s.startsWith("fe9") || s.startsWith("fea") || s.startsWith("feb")) return true; // fe80::/10
  if (/^f[cd]/.test(s)) return true;              // fc00::/7 unique-local
  if (s.startsWith("::ffff:")) {
    const v4 = s.slice("::ffff:".length);
    return v4.includes(".") ? isPrivateIpv4(v4) : true;
  }
  return false;
}

export const isPrivateAddress = (ip: string, family: number): boolean =>
  family === 6 ? isPrivateIpv6(ip) : isPrivateIpv4(ip);

export interface ValidatedUrl {
  url: URL;
  /** Every address that passed the private-range check, in resolver order. */
  addresses: Array<{ address: string; family: number }>;
}

/** Throws `FetchFailure(BLOCKED_URL)` unless the URL is safe to open. */
export async function assertPublicUrl(raw: string, resolve: Resolver = realResolver): Promise<ValidatedUrl> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FetchFailure({ error: "That does not look like a URL.", code: "INVALID_INPUT", retryable: false });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw blocked(`Only http and https URLs can be scanned, not ${url.protocol.replace(":", "")}.`);
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host) throw blocked("That URL has no hostname.");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw blocked("That hostname points back at the server, so it will not be fetched.");
  }

  // A bare IP literal never reaches the resolver, so check it directly too.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    if (isPrivateIpv4(host)) throw blocked("That address is on a private network, so it will not be fetched.");
    return { url, addresses: [{ address: host, family: 4 }] };
  }
  if (host.includes(":")) {
    if (isPrivateIpv6(host)) throw blocked("That address is on a private network, so it will not be fetched.");
    return { url, addresses: [{ address: host, family: 6 }] };
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await resolve(host);
  } catch {
    throw new FetchFailure({ error: `Could not resolve ${host}.`, code: "FETCH_FAILED", retryable: true });
  }
  if (addresses.length === 0) throw blocked(`${host} does not resolve to any address.`);
  for (const { address, family } of addresses) {
    if (isPrivateAddress(address, family)) {
      throw blocked(`${host} resolves to a private address, so it will not be fetched.`);
    }
  }
  return { url, addresses };
}

/**
 * The TOCTOU close-out. `assertPublicUrl` validates the addresses a hostname
 * resolves to; without pinning, the socket would resolve the name a SECOND time
 * and a DNS-rebinding server can answer 127.0.0.1 on that second lookup. So the
 * connection is opened against the address we already validated: undici's
 * `connect.lookup` is forced to hand back exactly that one address.
 */
export type FetchFactory = (pin: { address: string; family: number }) => typeof fetch;

type LookupFn = (
  hostname: string,
  options: unknown,
  callback: (err: NodeJS.ErrnoException | null, addresses: Array<{ address: string; family: number }>) => void,
) => void;

/** A DNS lookup that can only ever answer with the already-validated address. */
export const pinnedLookup =
  (pin: { address: string; family: number }): LookupFn =>
  (_hostname, _options, callback) =>
    callback(null, [{ address: pin.address, family: pin.family }]);

export const pinnedFetchFactory: FetchFactory = (pin) => {
  const dispatcher = new Agent({ connect: { lookup: pinnedLookup(pin) } });
  return ((input: RequestInfo | URL, init?: RequestInit) =>
    undiciFetch(String(input), { ...init, dispatcher } as never)) as unknown as typeof fetch;
};

export interface FetchedPolicy {
  text: string;
  title: string;
  finalUrl: string;
}

export async function fetchPolicyText(
  raw: string,
  deps: { resolve?: Resolver; fetchFactory?: FetchFactory } = {},
): Promise<FetchedPolicy> {
  const makeFetch = deps.fetchFactory ?? pinnedFetchFactory;
  let { url, addresses } = await assertPublicUrl(raw, deps.resolve);
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);

  let response: Response | null = null;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res: Response;
    // One resolve, one validate, one pinned connect — per hop.
    const doFetch = makeFetch(addresses[0]);
    try {
      res = await doFetch(url.toString(), {
        redirect: "manual",
        signal,
        headers: { "user-agent": "RedFlagsBot/1.0 (+privacy-policy scanner)", accept: "text/html,*/*" },
      });
    } catch (err) {
      const timedOut = String((err as { name?: string })?.name) === "TimeoutError";
      throw new FetchFailure({
        error: timedOut ? "That site took longer than 8 seconds to answer." : "That site could not be reached.",
        code: "FETCH_FAILED",
        retryable: true,
      });
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) break;
      if (hop === MAX_REDIRECTS) {
        throw new FetchFailure({ error: "That URL redirects too many times.", code: "FETCH_FAILED", retryable: false });
      }
      // Re-validate every hop: a redirect to 169.254.169.254 is the classic bypass.
      ({ url, addresses } = await assertPublicUrl(new URL(location, url).toString(), deps.resolve));
      continue;
    }
    response = res;
    break;
  }

  if (!response) {
    throw new FetchFailure({ error: "That URL redirects without going anywhere.", code: "FETCH_FAILED", retryable: false });
  }
  if (!response.ok) {
    throw new FetchFailure({
      error: `That site answered ${response.status}. Many policy pages block bots, so paste the text instead.`,
      code: "FETCH_FAILED",
      retryable: false,
    });
  }

  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  if (contentType && !contentType.includes("html") && !contentType.includes("text/plain")) {
    throw new FetchFailure({
      error: `That URL returned ${contentType.split(";")[0]}, not a web page.`,
      code: "NOT_HTML",
      retryable: false,
    });
  }

  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > MAX_BYTES) {
    throw new FetchFailure({ error: "That page is larger than 2 MB.", code: "CONTENT_TOO_LARGE", retryable: false });
  }

  const buffer = await readCapped(response);
  const html = new TextDecoder("utf-8").decode(buffer);

  // Loaded lazily and left external to the bundler (next.config
  // serverExternalPackages): jsdom's dependency chain trips ERR_REQUIRE_ESM
  // when bundled, and only the URL path needs a DOM at all.
  const [{ JSDOM }, { Readability }] = await Promise.all([import("jsdom"), import("@mozilla/readability")]);
  const dom = new JSDOM(html, { url: url.toString() });
  const article = new Readability(dom.window.document).parse();
  const text = (article?.textContent ?? dom.window.document.body?.textContent ?? "").trim();
  if (text.length < 200) {
    throw new FetchFailure({
      error: "That page had almost no readable text on it.",
      code: "EMPTY_CONTENT",
      retryable: false,
    });
  }
  return { text, title: article?.title ?? url.hostname, finalUrl: url.toString() };
}

async function readCapped(response: Response): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array(await response.arrayBuffer());
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new FetchFailure({ error: "That page is larger than 2 MB.", code: "CONTENT_TOO_LARGE", retryable: false });
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.byteLength; }
  return out;
}
