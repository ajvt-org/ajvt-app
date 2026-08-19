import { describe, it, expect } from "vitest";
import {
  difficultyOf,
  pointsInRange,
  normalisePoints,
  countByDifficulty,
  bandOf,
  DEFAULT_POINTS,
  POINTS_MIN,
  POINTS_MAX,
} from "./quizDifficulty";

describe("difficultyOf", () => {
  it("reads easy from the bottom band", () => {
    expect(difficultyOf(1)).toBe("EASY");
    expect(difficultyOf(5)).toBe("EASY");
    expect(difficultyOf(10)).toBe("EASY");
  });

  it("reads medium from the middle band", () => {
    expect(difficultyOf(11)).toBe("MEDIUM");
    expect(difficultyOf(16)).toBe("MEDIUM");
  });

  it("reads hard from the top band", () => {
    expect(difficultyOf(17)).toBe("HARD");
    expect(difficultyOf(20)).toBe("HARD");
  });

  it("keeps each band top inside that band", () => {
    expect(difficultyOf(10)).toBe("EASY");
    expect(difficultyOf(11)).toBe("MEDIUM");
    expect(difficultyOf(16)).toBe("MEDIUM");
    expect(difficultyOf(17)).toBe("HARD");
  });

  it("treats anything below the range as easy", () => {
    expect(difficultyOf(0)).toBe("EASY");
    expect(difficultyOf(-5)).toBe("EASY");
  });

  it("treats anything above the range as hard", () => {
    expect(difficultyOf(50)).toBe("HARD");
  });

  it("treats a value that is not a whole number as easy", () => {
    expect(difficultyOf(5.5)).toBe("EASY");
    expect(difficultyOf(Number.NaN)).toBe("EASY");
  });
});

describe("pointsInRange", () => {
  it("accepts the range and refuses outside it", () => {
    expect(pointsInRange(POINTS_MIN)).toBe(true);
    expect(pointsInRange(POINTS_MAX)).toBe(true);
    expect(pointsInRange(0)).toBe(false);
    expect(pointsInRange(21)).toBe(false);
  });

  it("refuses anything that is not a whole number", () => {
    expect(pointsInRange("10")).toBe(false);
    expect(pointsInRange(10.5)).toBe(false);
    expect(pointsInRange(null)).toBe(false);
  });
});

describe("normalisePoints", () => {
  it("keeps a value inside the range", () => {
    expect(normalisePoints(15)).toBe(15);
  });

  it("falls back to easy when nothing usable was given", () => {
    expect(normalisePoints(undefined)).toBe(DEFAULT_POINTS);
    expect(normalisePoints(0)).toBe(DEFAULT_POINTS);
    expect(normalisePoints(50)).toBe(DEFAULT_POINTS);
    expect(difficultyOf(normalisePoints(undefined))).toBe("EASY");
  });
});

describe("bandOf", () => {
  it("gives the range a difficulty covers", () => {
    expect(bandOf("MEDIUM")).toMatchObject({ from: 11, to: 16 });
  });
});

describe("countByDifficulty", () => {
  it("counts a mix", () => {
    expect(countByDifficulty([2, 8, 12, 15, 19])).toEqual({ EASY: 2, MEDIUM: 2, HARD: 1 });
  });

  it("counts nothing from nothing", () => {
    expect(countByDifficulty([])).toEqual({ EASY: 0, MEDIUM: 0, HARD: 0 });
  });
});
