import { describe, it, expect } from "vitest";
import { correctRate, NO_TALLY, talliesOf } from "./quizRecap";

describe("talliesOf", () => {
  it("counts the right and the wrong answers of a question apart", () => {
    const tallies = talliesOf([
      { questionId: "q1", isCorrect: true, count: 3 },
      { questionId: "q1", isCorrect: false, count: 1 },
    ]);

    expect(tallies.get("q1")).toEqual({ answered: 4, correct: 3 });
  });

  it("leaves out the members who never answered the question", () => {
    const tallies = talliesOf([
      { questionId: "q1", isCorrect: true, count: 2 },
      { questionId: "q1", isCorrect: null, count: 5 },
    ]);

    expect(tallies.get("q1")).toEqual({ answered: 2, correct: 2 });
  });

  it("keeps a question nobody answered at zero rather than dropping it", () => {
    const tallies = talliesOf([{ questionId: "q1", isCorrect: null, count: 4 }]);

    expect(tallies.get("q1")).toEqual({ answered: 0, correct: 0 });
  });

  it("keeps each question on its own count", () => {
    const tallies = talliesOf([
      { questionId: "q1", isCorrect: true, count: 1 },
      { questionId: "q2", isCorrect: false, count: 2 },
    ]);

    expect(tallies.get("q1")).toEqual({ answered: 1, correct: 1 });
    expect(tallies.get("q2")).toEqual({ answered: 2, correct: 0 });
  });

  it("has nothing to count when the round was never played", () => {
    expect(talliesOf([]).size).toBe(0);
  });
});

describe("correctRate", () => {
  it("reads the share of right answers as a whole percent", () => {
    expect(correctRate({ answered: 4, correct: 3 })).toBe(75);
  });

  it("rounds a rate that does not fall on a whole percent", () => {
    expect(correctRate({ answered: 3, correct: 1 })).toBe(33);
  });

  it("has no rate for a question nobody answered", () => {
    expect(correctRate(NO_TALLY)).toBeNull();
  });

  it("reads a question everybody got right as a hundred", () => {
    expect(correctRate({ answered: 7, correct: 7 })).toBe(100);
  });
});
