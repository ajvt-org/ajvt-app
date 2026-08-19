import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { NextRequest } from "next/server";
import {
  isRateLimited,
  recordFailedAttempt,
  clearAttempts,
  getClientIp,
  bucketKeys,
} from "./rateLimit";

const WINDOW = 60_000;

function requestWith(headers: Record<string, string>): NextRequest {
  return { headers: new Headers(headers) } as unknown as NextRequest;
}

describe("rate limit buckets", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lets an unknown key through", () => {
    expect(isRateLimited("fresh-key", 3)).toBe(false);
  });

  it("blocks once the attempts reach the limit", () => {
    const key = "login:1.2.3.4";
    recordFailedAttempt(key, WINDOW);
    recordFailedAttempt(key, WINDOW);
    expect(isRateLimited(key, 3)).toBe(false);

    recordFailedAttempt(key, WINDOW);
    expect(isRateLimited(key, 3)).toBe(true);
  });

  it("forgets the attempts once the window has passed", () => {
    const key = "login:5.6.7.8";
    for (let i = 0; i < 5; i++) recordFailedAttempt(key, WINDOW);
    expect(isRateLimited(key, 3)).toBe(true);

    vi.advanceTimersByTime(WINDOW + 1);
    expect(isRateLimited(key, 3)).toBe(false);
  });

  it("starts a new window after the old one expires", () => {
    const key = "login:9.9.9.9";
    for (let i = 0; i < 5; i++) recordFailedAttempt(key, WINDOW);
    vi.advanceTimersByTime(WINDOW + 1);

    recordFailedAttempt(key, WINDOW);
    expect(isRateLimited(key, 3)).toBe(false);
  });

  it("clears a key on a successful login", () => {
    const key = "login:4.4.4.4";
    for (let i = 0; i < 5; i++) recordFailedAttempt(key, WINDOW);
    expect(isRateLimited(key, 3)).toBe(true);

    clearAttempts(key);
    expect(isRateLimited(key, 3)).toBe(false);
  });

  it("keeps separate keys independent", () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt("login:a", WINDOW);
    expect(isRateLimited("login:a", 3)).toBe(true);
    expect(isRateLimited("login:b", 3)).toBe(false);
  });
});

describe("what the map holds", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("never holds the phone number it was given", () => {
    recordFailedAttempt("login:22334455", WINDOW);

    const keys = bucketKeys();
    expect(keys.some((k) => k.includes("22334455"))).toBe(false);
    expect(keys.join(" ")).not.toMatch(/\d{8}/);
    expect(keys).toContainEqual(expect.stringMatching(/^login:[0-9a-f]{16}$/));
  });

  it("still tells two members apart once their numbers are hashed", () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt("login:22334455", WINDOW);

    expect(isRateLimited("login:22334455", 3)).toBe(true);
    expect(isRateLimited("login:33445566", 3)).toBe(false);
  });

  it("keeps the same member in the same bucket across calls", () => {
    recordFailedAttempt("login:2299887766", WINDOW);
    recordFailedAttempt("login:2299887766", WINDOW);
    recordFailedAttempt("login:2299887766", WINDOW);

    expect(isRateLimited("login:2299887766", 3)).toBe(true);
  });

  it("keeps two scopes apart even for the same identifier", () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt("login:22001100", WINDOW);

    expect(isRateLimited("donate:22001100", 3)).toBe(false);
  });

  it("clears the bucket it was asked about and not another", () => {
    recordFailedAttempt("login:22112211", WINDOW);
    const before = bucketKeys().length;

    clearAttempts("login:22112211");

    expect(bucketKeys()).toHaveLength(before - 1);
  });
});

describe("sweeping what has expired", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("drops what has expired once the map has grown past the threshold", () => {
    for (let i = 0; i < 10_001; i++) recordFailedAttempt(`sweep:${i}`, WINDOW);
    expect(bucketKeys().length).toBeGreaterThan(10_000);

    vi.advanceTimersByTime(WINDOW + 1);
    recordFailedAttempt("after:1", WINDOW);

    expect(bucketKeys().some((k) => k.startsWith("sweep:"))).toBe(false);
    expect(bucketKeys().some((k) => k.startsWith("after:"))).toBe(true);
  });

  it("leaves a window that is still running alone", () => {
    for (let i = 0; i < 10_001; i++) recordFailedAttempt(`live:${i}`, WINDOW);

    recordFailedAttempt("live:0", WINDOW);

    expect(isRateLimited("live:0", 2)).toBe(true);
  });
});

describe("getClientIp", () => {
  it("takes the first entry of x-forwarded-for", () => {
    expect(getClientIp(requestWith({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
  });

  it("trims whitespace around the address", () => {
    expect(getClientIp(requestWith({ "x-forwarded-for": "  1.2.3.4  , 10.0.0.1" }))).toBe(
      "1.2.3.4",
    );
  });

  it("falls back to x-real-ip", () => {
    expect(getClientIp(requestWith({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
  });

  it("returns a constant when the proxy sends nothing", () => {
    expect(getClientIp(requestWith({}))).toBe("unknown");
  });
});
