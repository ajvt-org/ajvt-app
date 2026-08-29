import { describe, it, expect } from "vitest";
import {
  closesAtFrom,
  isVoteClosed,
  msLeft,
  mvpWinner,
  validMinutes,
  MVP_VOTE_MINUTES_MAX,
} from "./mvpVote";

const OPENED = new Date("2026-05-01T10:00:00.000Z");

describe("closesAtFrom", () => {
  it("puts the deadline a number of minutes after the vote opened", () => {
    expect(closesAtFrom(OPENED, 90).toISOString()).toBe("2026-05-01T11:30:00.000Z");
  });
});

describe("msLeft", () => {
  it("counts down toward the deadline", () => {
    expect(msLeft(closesAtFrom(OPENED, 10), OPENED)).toBe(600_000);
  });

  it("never goes below zero", () => {
    expect(msLeft(OPENED, new Date("2026-05-02T10:00:00.000Z"))).toBe(0);
  });
});

describe("isVoteClosed", () => {
  const open = { status: "OPEN" as const, closesAt: closesAtFrom(OPENED, 60) };

  it("is open before the deadline", () => {
    expect(isVoteClosed(open, OPENED)).toBe(false);
  });

  it("closes itself once the deadline passes", () => {
    expect(isVoteClosed(open, new Date("2026-05-01T11:00:01.000Z"))).toBe(true);
  });

  it("closes on the exact deadline rather than a moment after", () => {
    expect(isVoteClosed(open, new Date("2026-05-01T11:00:00.000Z"))).toBe(true);
  });

  it("respects an admin closing it early", () => {
    expect(isVoteClosed({ status: "CLOSED", closesAt: closesAtFrom(OPENED, 60) }, OPENED)).toBe(
      true,
    );
  });
});

describe("mvpWinner", () => {
  it("returns the single leader", () => {
    expect(
      mvpWinner([
        { memberId: "a", votes: 3 },
        { memberId: "b", votes: 5 },
      ]),
    ).toBe("b");
  });

  it("returns nobody on a tie, so no winner is invented", () => {
    expect(
      mvpWinner([
        { memberId: "a", votes: 4 },
        { memberId: "b", votes: 4 },
      ]),
    ).toBeNull();
  });

  it("returns nobody when nobody voted", () => {
    expect(
      mvpWinner([
        { memberId: "a", votes: 0 },
        { memberId: "b", votes: 0 },
      ]),
    ).toBeNull();
  });

  it("returns nobody over an empty list", () => {
    expect(mvpWinner([])).toBeNull();
  });
});

describe("validMinutes", () => {
  it("takes a whole number of minutes inside the range", () => {
    expect(validMinutes(1)).toBe(true);
    expect(validMinutes(MVP_VOTE_MINUTES_MAX)).toBe(true);
  });

  it("refuses zero, a fraction and anything past the ceiling", () => {
    expect(validMinutes(0)).toBe(false);
    expect(validMinutes(1.5)).toBe(false);
    expect(validMinutes(MVP_VOTE_MINUTES_MAX + 1)).toBe(false);
    expect(validMinutes("soon")).toBe(false);
  });
});
