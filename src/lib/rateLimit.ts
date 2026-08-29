import { NextRequest } from "next/server";
import { createHash } from "crypto";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const KEPT = 16;
const SWEEP_ABOVE = 10_000;

function bucketKey(key: string): string {
  const at = key.indexOf(":");
  const scope = at === -1 ? "" : key.slice(0, at + 1);
  const identifier = at === -1 ? key : key.slice(at + 1);
  return scope + createHash("sha256").update(identifier).digest("hex").slice(0, KEPT);
}

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

export function forgetRateLimits(): void {
  buckets.clear();
}

export function bucketKeys(): string[] {
  return [...buckets.keys()];
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const hops = (forwarded ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  return hops.at(-1) || req.headers.get("x-real-ip")?.trim() || "unknown";
}
