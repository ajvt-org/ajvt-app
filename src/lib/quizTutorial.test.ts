import { describe, it, expect } from "vitest";
import { TUTORIAL_QUESTIONS, isRight, gradeTutorial } from "./quizTutorial";
import { DEFAULT_CURVE } from "./competitionConfig";

const [single] = TUTORIAL_QUESTIONS;
const multi = {
  id: "m1",
  text: "سؤال متعدد",
  category: "تجربة",
  points: 20,
  correctCount: 2,
  options: [
    { id: "m1a", text: "أ" },
    { id: "m1b", text: "ب" },
    { id: "m1c", text: "ج" },
  ],
  correctIds: ["m1a", "m1c"],
};

describe("the tutorial bank", () => {
  it("holds exactly three questions", () => {
    expect(TUTORIAL_QUESTIONS).toHaveLength(3);
  });

  it("gives every question at least two options", () => {
    expect(TUTORIAL_QUESTIONS.every((q) => q.options.length >= 2)).toBe(true);
  });

  it("marks as many right answers as it asks for", () => {
    expect(TUTORIAL_QUESTIONS.every((q) => q.correctIds.length === q.correctCount)).toBe(true);
  });

  it("only marks options that exist", () => {
    for (const question of TUTORIAL_QUESTIONS) {
      const ids = new Set(question.options.map((o) => o.id));
      expect(question.correctIds.every((id) => ids.has(id))).toBe(true);
    }
  });
});

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

  it("keeps every tutorial question to a single answer", () => {
    for (const question of TUTORIAL_QUESTIONS) {
      expect(question.correctCount).toBe(1);
      expect(question.correctIds).toHaveLength(1);
    }
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

  it("falls back to the tutorial's own bands", () => {
    expect(gradeTutorial(single, single.correctIds, 2_000).points).toBe(10);
  });

  it("closes the tutorial question after ten seconds", () => {
    const out = gradeTutorial(single, single.correctIds, 12_000);

    expect(out.isCorrect).toBe(false);
    expect(out.points).toBe(0);
  });
});
