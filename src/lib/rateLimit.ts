import { NextRequest } from "next/server";
import { createHash } from "crypto";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Single Render instance (WEB_CONCURRENCY=1) — an in-memory map is enough, no
// need for a shared store like Redis at this scale. Two consequences of that
// choice, both accepted: a restart clears every lockout, so an attacker who can
// force a deploy can also clear their own; and a second instance would each
// keep its own count, so raising WEB_CONCURRENCY means moving this to a store
// the instances share.
//
// The identifier half of a key is hashed because callers pass a phone number or
// a username, and those are not kept in memory in the clear any more than they
// are written to the log. The scope stays readable so a bucket can still be
// told apart by what it counts. Sixteen hex characters is short enough to keep
// the map small; a collision merges two buckets, which locks out sooner rather
// than later.
const KEPT = 16;
const SWEEP_ABOVE = 10_000;

function bucketKey(key: string): string {
  const at = key.indexOf(":");
  const scope = at === -1 ? "" : key.slice(0, at + 1);
  const identifier = at === -1 ? key : key.slice(at + 1);
  return scope + createHash("sha256").update(identifier).digest("hex").slice(0, KEPT);
}

// Swept on write rather than on a timer: an interval would hold the process
// open and would have to be torn down in every test that imports this.
function sweep(now: number): void {
  if (buckets.size <= SWEEP_ABOVE) return;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

export function isRateLimited(key: string, max: number): boolean {
  const bucket = buckets.get(bucketKey(key));
  if (!bucket || Date.now() > bucket.resetAt) return false;
  return bucket.count >= max;
}

export function recordFailedAttempt(key: string, windowMs: number): void {
  const now = Date.now();
  sweep(now);

  const hashed = bucketKey(key);
  const bucket = buckets.get(hashed);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(hashed, { count: 1, resetAt: now + windowMs });
  } else {
    bucket.count += 1;
  }
}

export function clearAttempts(key: string): void {
  buckets.delete(bucketKey(key));
}

// The keys held right now. Nothing in the app calls this: it exists so a test
// can assert that what sits in memory carries no phone number.
export function bucketKeys(): string[] {
  return [...buckets.keys()];
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
