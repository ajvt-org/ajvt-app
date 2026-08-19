import { describe, it, expect } from "vitest";
import { spreadByDifficulty, planRounds, type BankQuestion } from "./quizDraw";
import { difficultyOf } from "./quizDifficulty";

const q = (id: string, category: string, points: number): BankQuestion => ({
  id,
  category,
  points,
});

function bank(category: string, counts: { easy: number; medium: number; hard: number }) {
  const made: BankQuestion[] = [];
  for (let i = 0; i < counts.easy; i++) made.push(q(`${category}-e${i}`, category, 5));
  for (let i = 0; i < counts.medium; i++) made.push(q(`${category}-m${i}`, category, 13));
  for (let i = 0; i < counts.hard; i++) made.push(q(`${category}-h${i}`, category, 19));
  return made;
}

const spread = (ids: BankQuestion[]) => {
  const out = { EASY: 0, MEDIUM: 0, HARD: 0 };
  for (const one of ids) out[difficultyOf(one.points)] += 1;
  return out;
};

describe("spreadByDifficulty", () => {
  it("takes an even share of each difficulty", () => {
    const drawn = spreadByDifficulty(bank("حساب", { easy: 5, medium: 5, hard: 5 }), 6, "s");

    expect(spread(drawn)).toEqual({ EASY: 2, MEDIUM: 2, HARD: 2 });
  });

  it("takes what it can when a difficulty runs short", () => {
    const drawn = spreadByDifficulty(bank("حساب", { easy: 5, medium: 1, hard: 0 }), 4, "s");

    expect(drawn).toHaveLength(4);
    expect(spread(drawn)).toEqual({ EASY: 3, MEDIUM: 1, HARD: 0 });
  });

  it("returns fewer than asked when the bank is short", () => {
    expect(spreadByDifficulty(bank("حساب", { easy: 2, medium: 0, hard: 0 }), 5, "s")).toHaveLength(
      2,
    );
  });

  it("never repeats a question", () => {
    const drawn = spreadByDifficulty(bank("حساب", { easy: 4, medium: 4, hard: 4 }), 12, "s");

    expect(new Set(drawn.map((one) => one.id)).size).toBe(12);
  });

  it("draws the same set for the same seed", () => {
    const source = bank("حساب", { easy: 5, medium: 5, hard: 5 });

    expect(spreadByDifficulty(source, 6, "s").map((one) => one.id)).toEqual(
      spreadByDifficulty(source, 6, "s").map((one) => one.id),
    );
  });

  it("draws a different set for a different seed", () => {
    const source = bank("حساب", { easy: 20, medium: 20, hard: 20 });

    expect(spreadByDifficulty(source, 6, "a").map((one) => one.id)).not.toEqual(
      spreadByDifficulty(source, 6, "b").map((one) => one.id),
    );
  });

  it("is empty when there is nothing to draw from", () => {
    expect(spreadByDifficulty([], 5, "s")).toEqual([]);
  });
});

describe("planRounds mixing categories", () => {
  const shape = { roundCount: 3, questionCount: 4, categoryRounds: false };

  it("fills every round of the run", () => {
    const plans = planRounds(
      [
        ...bank("حساب", { easy: 3, medium: 3, hard: 0 }),
        ...bank("دين", { easy: 3, medium: 3, hard: 0 }),
      ],
      shape,
      "c1",
    );

    expect(plans).toHaveLength(3);
    expect(plans.every((p) => p.questionIds.length === 4)).toBe(true);
  });

  it("never uses a question twice across the run", () => {
    const plans = planRounds(
      [
        ...bank("حساب", { easy: 6, medium: 6, hard: 0 }),
        ...bank("دين", { easy: 0, medium: 0, hard: 0 }),
      ],
      shape,
      "c1",
    );

    const all = plans.flatMap((p) => p.questionIds);
    expect(new Set(all).size).toBe(all.length);
  });

  it("leaves the round without a category", () => {
    const plans = planRounds(bank("حساب", { easy: 6, medium: 6, hard: 0 }), shape, "c1");

    expect(plans[0].category).toBeNull();
  });

  it("stops at the last round it can fill", () => {
    const plans = planRounds(bank("حساب", { easy: 5, medium: 0, hard: 0 }), shape, "c1");

    expect(plans).toHaveLength(1);
  });
});

describe("planRounds keeping a round to one category", () => {
  const shape = { roundCount: 3, questionCount: 4, categoryRounds: true };

  it("gives each round a single category", () => {
    const plans = planRounds(
      [
        ...bank("حساب", { easy: 3, medium: 3, hard: 2 }),
        ...bank("دين", { easy: 3, medium: 3, hard: 2 }),
      ],
      shape,
      "c1",
    );

    expect(plans).toHaveLength(3);
    for (const plan of plans) {
      expect(plan.questionIds.every((id) => id.startsWith(`${plan.category}-`))).toBe(true);
    }
  });

  it("spreads a round across the difficulties of its category", () => {
    const plans = planRounds(bank("حساب", { easy: 4, medium: 4, hard: 4 }), shape, "c1");

    const drawn = plans[0].questionIds;
    expect(drawn.filter((id) => id.includes("-e")).length).toBeGreaterThan(0);
    expect(drawn.filter((id) => id.includes("-m")).length).toBeGreaterThan(0);
    expect(drawn.filter((id) => id.includes("-h")).length).toBeGreaterThan(0);
  });

  it("never uses a question twice across the run", () => {
    const plans = planRounds(
      [
        ...bank("حساب", { easy: 4, medium: 4, hard: 4 }),
        ...bank("دين", { easy: 4, medium: 4, hard: 4 }),
      ],
      shape,
      "c1",
    );

    const all = plans.flatMap((p) => p.questionIds);
    expect(new Set(all).size).toBe(all.length);
  });

  it("takes the deepest category first", () => {
    const plans = planRounds(
      [
        ...bank("حساب", { easy: 10, medium: 0, hard: 0 }),
        ...bank("دين", { easy: 4, medium: 0, hard: 0 }),
      ],
      { roundCount: 1, questionCount: 4, categoryRounds: true },
      "c1",
    );

    expect(plans[0].category).toBe("حساب");
  });

  it("moves to another category once the first is too thin", () => {
    const plans = planRounds(
      [
        ...bank("حساب", { easy: 5, medium: 0, hard: 0 }),
        ...bank("دين", { easy: 5, medium: 0, hard: 0 }),
      ],
      { roundCount: 2, questionCount: 4, categoryRounds: true },
      "c1",
    );

    expect(plans.map((p) => p.category).sort()).toEqual(["حساب", "دين"]);
  });

  it("stops rather than mixing categories when none is deep enough", () => {
    const plans = planRounds(
      [
        ...bank("حساب", { easy: 3, medium: 0, hard: 0 }),
        ...bank("دين", { easy: 3, medium: 0, hard: 0 }),
      ],
      shape,
      "c1",
    );

    expect(plans).toEqual([]);
  });

  it("fills fewer rounds than a mixed draw would from the same bank", () => {
    const thin = [
      ...bank("حساب", { easy: 3, medium: 0, hard: 0 }),
      ...bank("دين", { easy: 3, medium: 0, hard: 0 }),
    ];

    expect(planRounds(thin, shape, "c1")).toHaveLength(0);
    expect(planRounds(thin, { ...shape, categoryRounds: false }, "c1").length).toBeGreaterThan(0);
  });
});
