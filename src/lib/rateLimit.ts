import { NextRequest } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Single Render instance (WEB_CONCURRENCY=1) — an in-memory map is enough,
// no need for a shared store like Redis at this scale.
export function isRateLimited(key: string, max: number): boolean {
  const bucket = buckets.get(key);
  if (!bucket || Date.now() > bucket.resetAt) return false;
  return bucket.count >= max;
}

export function recordFailedAttempt(key: string, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    bucket.count += 1;
  }
}

export function clearAttempts(key: string): void {
  buckets.delete(key);
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
