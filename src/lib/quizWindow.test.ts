import { describe, it, expect } from "vitest";
import {
  deadline,
  elapsedMs,
  remainingMs,
  windowExpired,
  GRACE_MS,
  DEFAULT_ANSWER_WINDOW_SECONDS,
} from "@/lib/quizWindow";

const revealed = new Date("2026-03-01T10:00:00.000Z");
const at = (ms: number) => new Date(revealed.getTime() + ms);

describe("deadline", () => {
  it("is the reveal plus the window", () => {
    expect(deadline(revealed, 10).toISOString()).toBe("2026-03-01T10:00:10.000Z");
  });
});

describe("elapsedMs", () => {
  it("counts from the reveal", () => {
    expect(elapsedMs(revealed, at(3200))).toBe(3200);
  });

  it("never goes negative when clocks disagree", () => {
    expect(elapsedMs(revealed, at(-500))).toBe(0);
  });
});

describe("remainingMs", () => {
  it("counts down to the deadline", () => {
    expect(remainingMs(revealed, at(4000), 10)).toBe(6000);
  });

  it("bottoms out at zero", () => {
    expect(remainingMs(revealed, at(30000), 10)).toBe(0);
  });
});

describe("windowExpired", () => {
  it("is open inside the window", () => {
    expect(windowExpired(revealed, at(9000), 10)).toBe(false);
  });

  it("forgives a moment of network lag past the deadline", () => {
    expect(windowExpired(revealed, at(10000 + GRACE_MS - 1), 10)).toBe(false);
  });

  it("closes once the grace is gone too", () => {
    expect(windowExpired(revealed, at(10000 + GRACE_MS + 1), 10)).toBe(true);
  });

  it("uses the window it is given, not the default", () => {
    expect(windowExpired(revealed, at(20000), DEFAULT_ANSWER_WINDOW_SECONDS)).toBe(true);
    expect(windowExpired(revealed, at(20000), 60)).toBe(false);
  });
});
