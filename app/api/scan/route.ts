import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { ScanError, ScanErrorCode, ScanResult } from "@/lib/types";
import { scan, ScanFailure } from "@/lib/scan";
import { fetchPolicyText, FetchFailure } from "@/lib/fetch-policy";

export const runtime = "nodejs";
export const maxDuration = 10;
export const dynamic = "force-dynamic";

const LLM_TIMEOUT_MS = 6_500;
// maxDuration is 10s. A URL fetch can burn 8s on its own, so the LLM gets only
// what is left of a 9s budget, minus 500ms to serialise and answer.
const BUDGET_MS = 9_000;
const RESPONSE_RESERVE_MS = 500;
const MIN_LLM_MS = 1_500;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

const bodySchema = z
  .object({
    policyId: z.string().min(1).max(64).optional(),
    text: z.string().max(600_000).optional(),
    url: z.string().min(4).max(2048).optional(),
  })
  .strict()
  .refine(
    (b) => [b.policyId, b.text, b.url].filter((v) => v !== undefined && v !== "").length === 1,
    { message: "Send exactly one of policyId, text or url." },
  );

// In-memory token bucket. Per-instance by design: this is a throttle for a
// single hobby function, not a distributed quota.
const buckets = new Map<string, { tokens: number; refilledAt: number }>();

function takeToken(ip: string, now = Date.now()): boolean {
  const bucket = buckets.get(ip) ?? { tokens: RATE_LIMIT, refilledAt: now };
  const elapsed = now - bucket.refilledAt;
  if (elapsed > 0) {
    bucket.tokens = Math.min(RATE_LIMIT, bucket.tokens + (elapsed / RATE_WINDOW_MS) * RATE_LIMIT);
    bucket.refilledAt = now;
  }
  if (buckets.size > 5000) evictOldest(buckets);
  if (bucket.tokens < 1) {
    buckets.set(ip, bucket);
    return false;
  }
  bucket.tokens -= 1;
  buckets.set(ip, bucket);
  return true;
}

/** Drop the oldest 20% (Map iterates in insertion order) rather than wiping
 *  every bucket, which would hand a full quota back to an attacker on demand. */
function evictOldest(map: Map<string, unknown>): void {
  const drop = Math.max(1, Math.floor(map.size * 0.2));
  let n = 0;
  for (const key of map.keys()) {
    if (n++ >= drop) break;
    map.delete(key);
  }
}

/**
 * The LAST x-forwarded-for entry is the one the platform's own proxy appended;
 * everything before it is attacker-controlled text. Exported for test.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

const STATUS: Record<ScanErrorCode, number> = {
  INVALID_INPUT: 400,
  BLOCKED_URL: 400,
  NOT_HTML: 415,
  EMPTY_CONTENT: 422,
  CONTENT_TOO_LARGE: 413,
  FETCH_FAILED: 502,
  RATE_LIMITED: 429,
  SCAN_FAILED: 500,
};

const NO_STORE = { "content-type": "application/json", "cache-control": "no-store" };

const fail = (payload: ScanError) =>
  new Response(JSON.stringify(payload), { status: STATUS[payload.code], headers: NO_STORE });

const ok = (payload: ScanResult) =>
  new Response(JSON.stringify(payload), { status: 200, headers: NO_STORE });

const policiesDir = () => path.join(process.cwd(), "public", "policies");

interface PolicyIndexEntry { id: string; name: string; url: string; fetchedAt: string; chars: number }
interface PolicyFile extends PolicyIndexEntry { text: string }

async function loadPolicy(policyId: string): Promise<PolicyFile> {
  const index = JSON.parse(
    await readFile(path.join(policiesDir(), "index.json"), "utf8"),
  ) as PolicyIndexEntry[];
  // Allowlist, not path sanitising: the id must be one we shipped.
  const entry = index.find((p) => p.id === policyId);
  if (!entry) {
    throw new ScanFailure({
      error: `No policy called "${policyId}" is in the fleet.`,
      code: "INVALID_INPUT",
      retryable: false,
    });
  }
  return JSON.parse(await readFile(path.join(policiesDir(), `${entry.id}.json`), "utf8")) as PolicyFile;
}

export async function POST(request: Request): Promise<Response> {
  const started = Date.now();
  if (!takeToken(clientIp(request))) {
    return fail({
      error: `Too many scans — ${RATE_LIMIT} a minute is the limit. Try again shortly.`,
      code: "RATE_LIMITED",
      retryable: true,
    });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail({ error: "The request body was not valid JSON.", code: "INVALID_INPUT", retryable: false });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return fail({
      error: parsed.error.issues[0]?.message ?? "Send exactly one of policyId, text or url.",
      code: "INVALID_INPUT",
      retryable: false,
    });
  }

  const { policyId, text, url } = parsed.data;

  try {
    if (policyId) {
      const policy = await loadPolicy(policyId);
      return ok(await scan(policy.text, { llmTimeoutMs: LLM_TIMEOUT_MS, policyId: policy.id }));
    }
    if (url) {
      const fetched = await fetchPolicyText(url);
      const llmTimeoutMs = Math.max(
        0,
        Math.min(LLM_TIMEOUT_MS, BUDGET_MS - (Date.now() - started) - RESPONSE_RESERVE_MS),
      );
      if (llmTimeoutMs < MIN_LLM_MS) {
        const result = await scan(fetched.text, { llm: false });
        return ok({ ...result, meta: { ...result.meta, llm: "skipped:timeout" } });
      }
      return ok(await scan(fetched.text, { llmTimeoutMs }));
    }
    return ok(await scan(text ?? "", { llmTimeoutMs: LLM_TIMEOUT_MS }));
  } catch (err) {
    if (err instanceof ScanFailure || err instanceof FetchFailure) return fail(err.payload);
    console.error("[scan] unexpected failure", err);
    return fail({ error: "The scan failed unexpectedly.", code: "SCAN_FAILED", retryable: true });
  }
}
