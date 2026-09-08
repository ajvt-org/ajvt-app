import { describe, it, expect } from "vitest";
import { quiz } from "./quiz";

describe("what a quiz form says is wrong", () => {
  it("names how many correct answers were asked for", () => {
    expect(quiz.correctCountExact("إجابتين")).toContain("إجابتين");
  });

  it("keeps too many correct apart from an invalid count", () => {
    expect(quiz.tooManyCorrect).not.toBe(quiz.correctCountInvalid);
    expect(quiz.correctCountOverAnswers).not.toBe(quiz.tooManyCorrect);
  });

  it("says a point value has to be a positive whole number", () => {
    expect(quiz.pointsNotPositive).not.toBe(quiz.pointsOutOfRange);
  });
});
