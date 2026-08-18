import { describe, it, expect } from "vitest";
import { parseImport, reviewImport, IMPORT_MAX } from "./quizImport";
import { quiz } from "./messages/quiz";
import { difficultyOf } from "./quizDifficulty";

const defaults = { points: 10, correctCount: 1 };

const good = {
  text: "ما عاصمة موريتانيا؟",
  category: "جغرافيا",
  answers: [
    { text: "نواكشوط", isCorrect: true },
    { text: "نواذيبو", isCorrect: false },
  ],
};

const review = (rows: unknown) => reviewImport(rows, defaults);

describe("reviewImport", () => {
  it("takes a well formed question", () => {
    const r = review([good]);

    expect(r.problems).toEqual([]);
    expect(r.questions).toHaveLength(1);
    expect(r.questions[0].text).toBe("ما عاصمة موريتانيا؟");
  });

  it("falls back to the settings for points and correct count", () => {
    expect(review([good]).questions[0]).toMatchObject({ points: 10, correctCount: 1 });
  });

  it("keeps the values a question states for itself", () => {
    const r = review([{ ...good, points: 25, correctCount: 1 }]);

    expect(r.questions[0].points).toBe(25);
  });

  it("accepts answers written as plain strings with the correct one marked", () => {
    const r = review([{ ...good, answers: ["نواكشوط", "نواذيبو"], correctCount: 1 }]);

    expect(r.problems[0].message).toContain("0");
  });

  it("refuses anything that is not a list", () => {
    expect(review({}).problems[0].message).toBe(quiz.importNotArray);
    expect(review("nope").problems[0].message).toBe(quiz.importNotArray);
  });

  it("refuses an empty list", () => {
    expect(review([]).problems[0].message).toBe(quiz.importEmpty);
  });

  it("refuses more than the batch limit in one go", () => {
    const many = Array.from({ length: IMPORT_MAX + 1 }, () => good);

    expect(review(many).problems[0].message).toBe(quiz.importTooMany);
  });

  it("names the row that is wrong rather than failing the whole file", () => {
    const r = review([good, { ...good, text: "  " }, { ...good, text: "سؤال آخر" }]);

    expect(r.questions).toHaveLength(2);
    expect(r.problems).toEqual([{ index: 1, message: quiz.textRequired }]);
  });

  it("refuses a question with fewer than two answers", () => {
    const r = review([{ ...good, answers: [{ text: "نواكشوط", isCorrect: true }] }]);

    expect(r.problems[0].message).toBe(quiz.twoAnswersMinimum);
  });

  it("refuses a blank answer", () => {
    const r = review([{ ...good, answers: [{ text: "نواكشوط", isCorrect: true }, { text: " " }] }]);

    expect(r.problems[0].message).toBe(quiz.answersNeedText);
  });

  it("refuses the same answer twice inside one question", () => {
    const r = review([
      {
        ...good,
        answers: [
          { text: "نواكشوط", isCorrect: true },
          { text: " نواكشوط ", isCorrect: false },
        ],
      },
    ]);

    expect(r.problems[0].message).toBe(quiz.importAnswersDuplicate);
  });

  it("refuses the same question twice inside one file", () => {
    const r = review([good, { ...good, text: "ما عاصمة   موريتانيا؟ " }]);

    expect(r.questions).toHaveLength(1);
    expect(r.problems[0]).toEqual({ index: 1, message: quiz.importDuplicate });
  });

  it("refuses more correct answers marked than the question says it has", () => {
    const r = review([
      {
        ...good,
        correctCount: 1,
        answers: [
          { text: "نواكشوط", isCorrect: true },
          { text: "نواذيبو", isCorrect: true },
        ],
      },
    ]);

    expect(r.problems[0].message).toContain("2");
  });

  it("refuses asking for more correct answers than there are answers", () => {
    const r = review([{ ...good, correctCount: 5 }]);

    expect(r.problems[0].message).toBe(quiz.tooManyCorrect);
  });

  it("refuses a missing category", () => {
    const r = review([{ ...good, category: "" }]);

    expect(r.problems[0].message).toBe(quiz.categoryRequired);
  });
});

describe("parseImport", () => {
  it("reads a json file", () => {
    expect(parseImport(JSON.stringify([good]), defaults).questions).toHaveLength(1);
  });

  it("says so when the file is not json", () => {
    expect(parseImport("{ broken", defaults).problems[0].message).toBe(quiz.importBadJson);
  });
});

describe("points and difficulty on import", () => {
  it("takes points inside the range", () => {
    const r = review([{ ...good, points: 75 }]);

    expect(r.problems).toEqual([]);
    expect(r.questions[0].points).toBe(75);
  });

  it("refuses points outside the range rather than quietly clamping", () => {
    expect(review([{ ...good, points: 5 }]).problems[0].message).toContain("بين 10 و 100");
    expect(review([{ ...good, points: 500 }]).problems[0].message).toContain("بين 10 و 100");
  });

  it("refuses points that are not a whole number", () => {
    expect(review([{ ...good, points: 55.5 }]).problems[0].message).toContain("بين 10 و 100");
  });

  it("makes a question with no points an easy one", () => {
    const r = review([good]);

    expect(difficultyOf(r.questions[0].points)).toBe("EASY");
  });
});
