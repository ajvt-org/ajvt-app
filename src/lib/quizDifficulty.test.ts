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
    expect(difficultyOf(10)).toBe("EASY");
    expect(difficultyOf(30)).toBe("EASY");
    expect(difficultyOf(49)).toBe("EASY");
  });

  it("reads medium from the middle band", () => {
    expect(difficultyOf(50)).toBe("MEDIUM");
    expect(difficultyOf(79)).toBe("MEDIUM");
  });

  it("reads hard from the top band", () => {
    expect(difficultyOf(80)).toBe("HARD");
    expect(difficultyOf(100)).toBe("HARD");
  });

  it("gives a boundary to the harder band", () => {
    expect(difficultyOf(49)).toBe("EASY");
    expect(difficultyOf(50)).toBe("MEDIUM");
    expect(difficultyOf(79)).toBe("MEDIUM");
    expect(difficultyOf(80)).toBe("HARD");
  });

  it("treats anything below the range as easy", () => {
    expect(difficultyOf(0)).toBe("EASY");
    expect(difficultyOf(9)).toBe("EASY");
  });

  it("treats anything above the range as hard", () => {
    expect(difficultyOf(500)).toBe("HARD");
  });

  it("treats a value that is not a whole number as easy", () => {
    expect(difficultyOf(55.5)).toBe("EASY");
    expect(difficultyOf(Number.NaN)).toBe("EASY");
  });
});

describe("pointsInRange", () => {
  it("accepts the range and refuses outside it", () => {
    expect(pointsInRange(POINTS_MIN)).toBe(true);
    expect(pointsInRange(POINTS_MAX)).toBe(true);
    expect(pointsInRange(9)).toBe(false);
    expect(pointsInRange(101)).toBe(false);
  });

  it("refuses anything that is not a whole number", () => {
    expect(pointsInRange("50")).toBe(false);
    expect(pointsInRange(50.5)).toBe(false);
    expect(pointsInRange(null)).toBe(false);
  });
});

describe("normalisePoints", () => {
  it("keeps a value inside the range", () => {
    expect(normalisePoints(75)).toBe(75);
  });

  it("falls back to easy when nothing usable was given", () => {
    expect(normalisePoints(undefined)).toBe(DEFAULT_POINTS);
    expect(normalisePoints(0)).toBe(DEFAULT_POINTS);
    expect(normalisePoints(200)).toBe(DEFAULT_POINTS);
    expect(difficultyOf(normalisePoints(undefined))).toBe("EASY");
  });
});

describe("bandOf", () => {
  it("gives the range a difficulty covers", () => {
    expect(bandOf("MEDIUM")).toMatchObject({ from: 50, to: 79 });
  });
});

describe("countByDifficulty", () => {
  it("counts a mix", () => {
    expect(countByDifficulty([10, 20, 50, 60, 90])).toEqual({ EASY: 2, MEDIUM: 2, HARD: 1 });
  });

  it("counts nothing from nothing", () => {
    expect(countByDifficulty([])).toEqual({ EASY: 0, MEDIUM: 0, HARD: 0 });
  });
});
