import { describe, it, expect } from "vitest";
import { timeScore, DEFAULT_MIN_SHARE } from "@/lib/quizScore";

const base = { points: 10, windowSeconds: 10 };

describe("timeScore", () => {
  it("pays in full for an instant answer", () => {
    expect(timeScore({ ...base, elapsedMs: 0 })).toBe(10);
  });

  it("pays the floor for one that lands on the deadline", () => {
    expect(timeScore({ ...base, elapsedMs: 10_000 })).toBe(10 * DEFAULT_MIN_SHARE);
  });

  it("falls away as the seconds pass", () => {
    const quick = timeScore({ ...base, elapsedMs: 2_000 });
    const slower = timeScore({ ...base, elapsedMs: 6_000 });
    expect(quick).toBeGreaterThan(slower);
    expect(slower).toBeGreaterThan(timeScore({ ...base, elapsedMs: 9_000 }));
  });

  it("never pays more than the question is worth", () => {
    expect(timeScore({ ...base, elapsedMs: -500 })).toBe(10);
  });

  it("never drops below a single point for a right answer", () => {
    expect(timeScore({ points: 1, windowSeconds: 10, elapsedMs: 10_000 })).toBe(1);
  });

  it("clamps an answer somehow later than the window to the floor", () => {
    expect(timeScore({ ...base, elapsedMs: 60_000 })).toBe(10 * DEFAULT_MIN_SHARE);
  });

  it("takes the floor it is given", () => {
    expect(timeScore({ ...base, elapsedMs: 10_000, minShare: 0 })).toBe(1);
    expect(timeScore({ ...base, elapsedMs: 10_000, minShare: 1 })).toBe(10);
  });

  it("is zero for a question worth nothing", () => {
    expect(timeScore({ points: 0, windowSeconds: 10, elapsedMs: 0 })).toBe(0);
  });
});
