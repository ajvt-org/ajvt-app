import { describe, it, expect } from "vitest";
import { breakdownOf, rowPercent, bandLabels, type AnswerRow } from "./quizBreakdown";
import { DEFAULT_BANDS } from "./competitionConfig";

const row = (over: Partial<AnswerRow> = {}): AnswerRow => ({
  position: 0,
  question: "ما عاصمة موريتانيا؟",
  category: "جغرافيا",
  maxPoints: 10,
  isCorrect: true,
  elapsedMs: 5_000,
  points: 10,
  ...over,
});

describe("rowPercent", () => {
  it("gives the fast band to a quick correct answer", () => {
    expect(rowPercent(row({ elapsedMs: 5_000 }), DEFAULT_BANDS)).toBe(100);
  });

  it("gives a slower band to a slower correct answer", () => {
    expect(rowPercent(row({ elapsedMs: 20_000 }), DEFAULT_BANDS)).toBe(75);
  });

  it("gives nothing to a wrong answer", () => {
    expect(rowPercent(row({ isCorrect: false }), DEFAULT_BANDS)).toBe(0);
  });

  it("gives nothing to a question that was never answered", () => {
    expect(rowPercent(row({ isCorrect: null, elapsedMs: null }), DEFAULT_BANDS)).toBe(0);
  });
});

describe("breakdownOf", () => {
  it("orders the rows the way they were served", () => {
    const out = breakdownOf(
      [row({ position: 2 }), row({ position: 0 }), row({ position: 1 })],
      DEFAULT_BANDS,
    );

    expect(out.rows.map((r) => r.position)).toEqual([0, 1, 2]);
  });

  it("counts what was right against what was served", () => {
    const out = breakdownOf(
      [
        row(),
        row({ position: 1, isCorrect: false, points: 0 }),
        row({ position: 2, isCorrect: null, elapsedMs: null, points: 0 }),
      ],
      DEFAULT_BANDS,
    );

    expect(out.correct).toBe(1);
    expect(out.answered).toBe(2);
    expect(out.total).toBe(3);
  });

  it("adds the points to the attempt score", () => {
    const out = breakdownOf([row({ points: 10 }), row({ position: 1, points: 7 })], DEFAULT_BANDS);

    expect(out.score).toBe(17);
  });

  it("says what the round was worth in full", () => {
    const out = breakdownOf(
      [row({ maxPoints: 10, points: 5 }), row({ position: 1, maxPoints: 20, points: 0 })],
      DEFAULT_BANDS,
    );

    expect(out.possible).toBe(30);
  });

  it("adds the time spent across the round", () => {
    const out = breakdownOf(
      [row({ elapsedMs: 4_000 }), row({ position: 1, elapsedMs: 6_000 })],
      DEFAULT_BANDS,
    );

    expect(out.elapsedMs).toBe(10_000);
  });

  it("counts an unanswered question as no time at all", () => {
    const out = breakdownOf([row({ isCorrect: null, elapsedMs: null, points: 0 })], DEFAULT_BANDS);

    expect(out.elapsedMs).toBe(0);
    expect(out.score).toBe(0);
  });

  it("is empty for an attempt with nothing in it", () => {
    const out = breakdownOf([], DEFAULT_BANDS);

    expect(out.rows).toEqual([]);
    expect(out.total).toBe(0);
    expect(out.score).toBe(0);
  });
});

describe("bandLabels", () => {
  it("keeps the bands in the order they apply", () => {
    expect(bandLabels(DEFAULT_BANDS)).toEqual([
      { limit: 10, percent: 100 },
      { limit: 30, percent: 75 },
      { limit: null, percent: 50 },
    ]);
  });
});
