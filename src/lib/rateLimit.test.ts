import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { NextRequest } from "next/server";
import { isRateLimited, recordFailedAttempt, clearAttempts, getClientIp } from "./rateLimit";

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
