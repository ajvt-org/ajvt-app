import { describe, it, expect } from "vitest";
import { isMissed, missedAnswers, type RetryRow } from "./quizRetry";

const NOW = new Date("2026-08-20T10:00:00.000Z");
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000);
const MAX = 30;

const row = (over: Partial<RetryRow>): RetryRow => ({
  isCorrect: null,
  answeredAt: null,
  shownAt: null,
  ...over,
});

describe("isMissed", () => {
  it("counts a question closed with no answer", () => {
    expect(isMissed(row({ answeredAt: ago(60), isCorrect: null }), MAX, NOW)).toBe(true);
  });

  it("leaves a question that was answered, right or wrong", () => {
    expect(isMissed(row({ answeredAt: ago(60), isCorrect: true }), MAX, NOW)).toBe(false);
    expect(isMissed(row({ answeredAt: ago(60), isCorrect: false }), MAX, NOW)).toBe(false);
  });

  it("counts a question whose clock ran out while nobody was watching", () => {
    expect(isMissed(row({ shownAt: ago(MAX + 5) }), MAX, NOW)).toBe(true);
  });

  it("leaves the question the member is answering right now", () => {
    expect(isMissed(row({ shownAt: ago(5) }), MAX, NOW)).toBe(false);
  });

  it("leaves a question nobody has opened yet", () => {
    expect(isMissed(row({}), MAX, NOW)).toBe(false);
  });

  it("holds the line exactly at the window", () => {
    expect(isMissed(row({ shownAt: ago(MAX) }), MAX, NOW)).toBe(false);
  });
});

describe("missedAnswers", () => {
  it("picks out only what can be given back", () => {
    const rows = [
      { id: "kept", ...row({ answeredAt: ago(60), isCorrect: true }) },
      { id: "swept", ...row({ answeredAt: ago(60), isCorrect: null }) },
      { id: "stranded", ...row({ shownAt: ago(120) }) },
      { id: "live", ...row({ shownAt: ago(2) }) },
      { id: "unopened", ...row({}) },
    ];

    expect(missedAnswers(rows, MAX, NOW).map((r) => r.id)).toEqual(["swept", "stranded"]);
  });

  it("finds nothing in a round answered all the way through", () => {
    const rows = [{ id: "a", ...row({ answeredAt: ago(60), isCorrect: false }) }];

    expect(missedAnswers(rows, MAX, NOW)).toEqual([]);
  });
});
