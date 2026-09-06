import { describe, it, expect } from "vitest";
import { isRight, gradeTutorial } from "./quizTutorial";
import { DEFAULT_CURVE, type ScoreCurve } from "./competitionConfig";

const TUTORIAL_CURVE: ScoreCurve = { fullSeconds: 3, maxSeconds: 10, floorPercent: 50 };

const single = { id: "t1", points: 10, correctCount: 1, correctIds: ["t1a"] };
const multi = { id: "m1", points: 20, correctCount: 2, correctIds: ["m1a", "m1c"] };

describe("isRight", () => {
  it("takes the one right option", () => {
    expect(isRight(single, single.correctIds)).toBe(true);
  });

  it("refuses a wrong option", () => {
    expect(isRight(single, ["t1b"])).toBe(false);
  });

  it("wants every right option of a multiple answer question", () => {
    expect(isRight(multi, [multi.correctIds[0]])).toBe(false);
    expect(isRight(multi, multi.correctIds)).toBe(true);
  });

  it("refuses a right option padded with a wrong one", () => {
    expect(isRight(multi, [...multi.correctIds, "m1b"])).toBe(false);
  });

  it("refuses an empty answer", () => {
    expect(isRight(single, [])).toBe(false);
  });
});

describe("gradeTutorial", () => {
  it("pays the full points for a quick right answer", () => {
    expect(gradeTutorial(single, single.correctIds, 2_000, DEFAULT_CURVE).points).toBe(10);
  });

  it("pays less for a slower right answer", () => {
    expect(gradeTutorial(single, single.correctIds, 20_000, DEFAULT_CURVE).points).toBe(8);
  });

  it("pays nothing once the question time is up", () => {
    const out = gradeTutorial(single, single.correctIds, 60_000, DEFAULT_CURVE);

    expect(out.isCorrect).toBe(false);
    expect(out.points).toBe(0);
  });

  it("pays nothing for a wrong answer", () => {
    const out = gradeTutorial(single, ["t1b"], 2_000, DEFAULT_CURVE);

    expect(out.isCorrect).toBe(false);
    expect(out.points).toBe(0);
  });

  it("takes the bands it is given rather than one of its own", () => {
    expect(gradeTutorial(single, single.correctIds, 2_000, TUTORIAL_CURVE).points).toBe(10);
    expect(gradeTutorial(single, single.correctIds, 12_000, TUTORIAL_CURVE).points).toBe(0);
  });
});
