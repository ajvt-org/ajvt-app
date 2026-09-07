import { describe, it, expect } from "vitest";
import { nextOrderUnder, resolveMatch, type AdjustmentRow, type UnitRow } from "./seriesTree";
import type { LevelRow } from "./matchLevels";

const BLANK: LevelRow = {
  id: "match",
  order: 0,
  singular: "المباراة",
  plural: "المباريات",
  ending: null,
  unitsPerParent: null,
  unitsToWin: null,
  target: null,
  deciderTarget: null,
  bothPastTarget: null,
  extendsWhenLevel: false,
  extensionUnits: 0,
  startingCredit: 0,
  creditWindow: 0,
  halvesPerUnit: 2,
  decision: null,
  wonUnitWorth: 1,
  doubledWorth: 1,
  doublesOnBlankOpponent: false,
  doublesOnRecoveredCredit: false,
};

const CARDS: LevelRow[] = [
  { ...BLANK, id: "match", order: 0, ending: "FIRST_TO", unitsPerParent: 3, unitsToWin: 2 },
  {
    ...BLANK,
    id: "set",
    order: 1,
    singular: "شوط",
    plural: "أشواط",
    decision: "SCORE",
    ending: "FIRST_TO",
    unitsPerParent: 25,
    unitsToWin: 12,
    halvesPerUnit: 1,
  },
  {
    ...BLANK,
    id: "point",
    order: 2,
    singular: "نقطة",
    plural: "نقاط",
    decision: "SCORE",
    ending: "FIRST_PAST",
    unitsPerParent: 20,
    target: 100,
    bothPastTarget: "PLAY_ON",
    halvesPerUnit: 1,
  },
  { ...BLANK, id: "round", order: 3, singular: "دور", plural: "أدوار", decision: "SCORE" },
];

function unit(over: Partial<UnitRow> & { id: string; levelId: string; order: number }): UnitRow {
  return {
    parentId: null,
    abandoned: false,
    outcome: null,
    sideAPoints: null,
    sideBPoints: null,
    sideAColour: null,
    worth: null,
    sideALostCredit: false,
    sideBLostCredit: false,
    ...over,
  };
}

describe("a unit with nothing under it", () => {
  it("keeps the score the admin typed", () => {
    const rows = [
      unit({ id: "s1", levelId: "set", order: 1, sideAPoints: 12, sideBPoints: 9 }),
      unit({ id: "s2", levelId: "set", order: 2, sideAPoints: 12, sideBPoints: 4 }),
    ];

    const { units, standing } = resolveMatch(CARDS, rows);

    expect(units[0].standing).toBeNull();
    expect(standing.winner).toBe("SIDE_A");
    expect(standing.over).toBe(true);
  });

  it("is a complete record rather than a broken one", () => {
    const rows = [unit({ id: "s1", levelId: "set", order: 1, sideAPoints: 12, sideBPoints: 9 })];

    const { standing } = resolveMatch(CARDS, rows);

    expect(standing.unitsRecorded).toBe(1);
    expect(standing.unitsScored).toBe(1);
    expect(standing.over).toBe(false);
  });
});

describe("a unit with something under it", () => {
  it("takes its score from its children rather than from what was typed", () => {
    const rows = [
      unit({ id: "s1", levelId: "set", order: 1, sideAPoints: 99, sideBPoints: 0 }),
      unit({
        id: "p1",
        levelId: "point",
        parentId: "s1",
        order: 1,
        sideAPoints: 101,
        sideBPoints: 20,
      }),
      unit({
        id: "p2",
        levelId: "point",
        parentId: "s1",
        order: 2,
        sideAPoints: 30,
        sideBPoints: 101,
      }),
    ];

    const { units } = resolveMatch(CARDS, rows);

    expect(units[0].standing?.sideATotal).toBe(1);
    expect(units[0].standing?.sideBTotal).toBe(1);
  });

  it("counts a point out of its rounds", () => {
    const rows = [
      unit({ id: "s1", levelId: "set", order: 1 }),
      unit({ id: "p1", levelId: "point", parentId: "s1", order: 1 }),
      unit({
        id: "r1",
        levelId: "round",
        parentId: "p1",
        order: 1,
        sideAPoints: 60,
        sideBPoints: 20,
      }),
      unit({
        id: "r2",
        levelId: "round",
        parentId: "p1",
        order: 2,
        sideAPoints: 45,
        sideBPoints: 30,
      }),
    ];

    const { units } = resolveMatch(CARDS, rows);
    const point = units[0].children[0];

    expect(point.standing?.sideATotal).toBe(105);
    expect(point.standing?.over).toBe(true);
    expect(units[0].standing?.sideATotal).toBe(1);
  });

  it("leaves a unit still being played out of the level above", () => {
    const rows = [
      unit({ id: "s1", levelId: "set", order: 1 }),
      unit({ id: "p1", levelId: "point", parentId: "s1", order: 1 }),
      unit({
        id: "r1",
        levelId: "round",
        parentId: "p1",
        order: 1,
        sideAPoints: 40,
        sideBPoints: 20,
      }),
    ];

    const { units } = resolveMatch(CARDS, rows);

    expect(units[0].children[0].standing?.over).toBe(false);
    expect(units[0].standing?.sideATotal).toBe(0);
  });
});

describe("a move recorded in a unit", () => {
  const rule = {
    id: "r",
    name: "تيس",
    unitsToSelf: 1,
    unitsFromOther: 1,
    levelId: null,
    endsUnit: false,
  };

  it("swings the level above the unit it sits in, before that unit is scored", () => {
    const rows = [unit({ id: "s1", levelId: "set", order: 1, sideAPoints: 12, sideBPoints: 4 })];
    const moves: AdjustmentRow[] = [{ id: "a1", unitId: "s1", side: "SIDE_B", rule }];

    const { standing } = resolveMatch(CARDS, rows, moves);

    expect(standing.sideBTotal).toBe(2);
    expect(standing.sideATotal).toBe(0);
    expect(standing.over).toBe(false);
  });

  it("takes a side below nothing rather than flooring at zero", () => {
    const rows = [unit({ id: "s1", levelId: "set", order: 1, sideAPoints: 4, sideBPoints: 12 })];
    const moves: AdjustmentRow[] = [{ id: "a1", unitId: "s1", side: "SIDE_B", rule }];

    const { standing } = resolveMatch(CARDS, rows, moves);

    expect(standing.sideATotal).toBe(-2);
  });
});

describe("the next order under a parent", () => {
  it("counts only the siblings that share it", () => {
    const rows = [
      unit({ id: "s1", levelId: "set", order: 1 }),
      unit({ id: "p1", levelId: "point", parentId: "s1", order: 1 }),
      unit({ id: "p2", levelId: "point", parentId: "s1", order: 2 }),
    ];

    expect(nextOrderUnder(rows, null)).toBe(2);
    expect(nextOrderUnder(rows, "s1")).toBe(3);
  });
});

describe("losing the starting credit", () => {
  const CREDITED = CARDS.map((level) =>
    level.id === "point" ? { ...level, startingCredit: 26, creditWindow: 2 } : level,
  );

  it("is computed from the rounds when the point has them", () => {
    const rows = [
      unit({ id: "s1", levelId: "set", order: 1 }),
      unit({ id: "p1", levelId: "point", parentId: "s1", order: 1 }),
      unit({
        id: "r1",
        levelId: "round",
        parentId: "p1",
        order: 1,
        sideAPoints: 30,
        sideBPoints: 0,
      }),
      unit({
        id: "r2",
        levelId: "round",
        parentId: "p1",
        order: 2,
        sideAPoints: 50,
        sideBPoints: 0,
      }),
    ];

    const { units } = resolveMatch(CREDITED, rows);
    const point = units[0].children[0];

    expect(point.standing?.sideBLostCredit).toBe(true);
    expect(point.standing?.sideBTotal).toBe(0);
    expect(point.standing?.sideATotal).toBe(106);
  });

  it("is taken from the row when the point was recorded with nothing under it", () => {
    const rows = [
      unit({ id: "s1", levelId: "set", order: 1 }),
      unit({
        id: "p1",
        levelId: "point",
        parentId: "s1",
        order: 1,
        sideAPoints: 101,
        sideBPoints: 0,
        sideBLostCredit: true,
      }),
    ];

    const { units } = resolveMatch(CREDITED, rows);

    expect(units[0].children[0].played.sideBLostCredit).toBe(true);
  });
});

describe("what a won unit is worth", () => {
  const DOUBLING = CARDS.map((level) =>
    level.id === "point"
      ? {
          ...level,
          startingCredit: 26,
          creditWindow: 2,
          doubledWorth: 2,
          doublesOnBlankOpponent: true,
          doublesOnRecoveredCredit: true,
        }
      : level,
  );

  function point(rounds: [number, number][]) {
    return [
      unit({ id: "s1", levelId: "set", order: 1 }),
      unit({ id: "p1", levelId: "point", parentId: "s1", order: 1 }),
      ...rounds.map(([a, b], index) =>
        unit({
          id: `r${index + 1}`,
          levelId: "round",
          parentId: "p1",
          order: index + 1,
          sideAPoints: a,
          sideBPoints: b,
        }),
      ),
    ];
  }

  it("counts two against a side that was blank when the last round began", () => {
    const rows = point([
      [40, 0],
      [30, 0],
      [20, 0],
      [11, 15],
    ]);

    const { units } = resolveMatch(DOUBLING, rows);

    expect(units[0].children[0].played.worth).toBe(2);
  });

  it("counts one where the losing side had already scored before the last round", () => {
    const rows = point([
      [40, 10],
      [30, 5],
      [40, 5],
    ]);

    const { units } = resolveMatch(DOUBLING, rows);

    expect(units[0].children[0].played.worth).toBe(1);
  });

  it("counts two for a side that lost its credit and won anyway", () => {
    const rows = point([
      [0, 30],
      [0, 20],
      [101, 5],
    ]);

    const { units } = resolveMatch(DOUBLING, rows);

    expect(units[0].children[0].standing?.sideALostCredit).toBe(true);
    expect(units[0].children[0].played.worth).toBe(2);
  });

  it("counts one where the level doubles on neither condition", () => {
    const rows = point([
      [40, 0],
      [30, 0],
      [40, 0],
    ]);

    const { units } = resolveMatch(CARDS, rows);

    expect(units[0].children[0].played.worth).toBe(1);
  });

  it("carries a doubled point through to the score of the set", () => {
    const rows = point([
      [40, 0],
      [30, 0],
      [20, 0],
      [11, 15],
    ]);

    const { units } = resolveMatch(DOUBLING, rows);

    expect(units[0].standing?.sideATotal).toBe(2);
  });

  it("takes the worth from the row when the point has nothing under it", () => {
    const rows = [
      unit({ id: "s1", levelId: "set", order: 1 }),
      unit({
        id: "p1",
        levelId: "point",
        parentId: "s1",
        order: 1,
        sideAPoints: 101,
        sideBPoints: 0,
        worth: 2,
      }),
    ];

    const { units } = resolveMatch(DOUBLING, rows);

    expect(units[0].standing?.sideATotal).toBe(2);
  });
});

describe("the deciding unit of a level", () => {
  const SHORT = CARDS.map((level) => (level.id === "set" ? { ...level, unitsToWin: 2 } : level));
  const DECIDED = SHORT.map((level) =>
    level.id === "set" ? { ...level, deciderTarget: 3 } : level,
  );

  function sets(scores: [number, number][][]) {
    return scores.flatMap(([...points], index) => [
      unit({ id: `s${index + 1}`, levelId: "set", order: index + 1 }),
      ...points.map(([a, b], at) =>
        unit({
          id: `s${index + 1}p${at + 1}`,
          levelId: "point",
          parentId: `s${index + 1}`,
          order: at + 1,
          sideAPoints: a,
          sideBPoints: b,
        }),
      ),
    ]);
  }

  it("plays to the ordinary target while the level above is not level", () => {
    const rows = sets([
      [
        [101, 20],
        [101, 30],
      ],
    ]);

    const { units } = resolveMatch(DECIDED, rows);

    expect(units[0].decider).toBe(false);
    expect(units[0].standing?.over).toBe(true);
    expect(units[0].standing?.target).toBe(2);
  });

  it("plays to its own target when the level above is level after the others", () => {
    const rows = sets([
      [
        [101, 20],
        [101, 30],
      ],
      [
        [20, 101],
        [30, 101],
      ],
      [
        [101, 20],
        [101, 30],
      ],
    ]);

    const { units } = resolveMatch(DECIDED, rows);

    expect(units[2].decider).toBe(true);
    expect(units[2].standing?.target).toBe(3);
    expect(units[2].standing?.over).toBe(false);
  });

  it("uses the ordinary target where the level declares no second one", () => {
    const rows = sets([
      [
        [101, 20],
        [101, 30],
      ],
      [
        [20, 101],
        [30, 101],
      ],
      [
        [101, 20],
        [101, 30],
      ],
    ]);

    const { units } = resolveMatch(SHORT, rows);

    expect(units[2].standing?.target).toBe(2);
    expect(units[2].standing?.over).toBe(true);
  });
});

describe("a rule that ends the unit it lands in", () => {
  const teysse = {
    id: "teysse",
    name: "تيس",
    unitsToSelf: 2,
    unitsFromOther: 2,
    levelId: "round",
    endsUnit: true,
  };

  const rows = [
    unit({ id: "s1", levelId: "set", order: 1 }),
    unit({ id: "p1", levelId: "point", parentId: "s1", order: 1 }),
    unit({
      id: "r1",
      levelId: "round",
      parentId: "p1",
      order: 1,
      sideAPoints: 60,
      sideBPoints: 10,
    }),
    unit({ id: "r2", levelId: "round", parentId: "p1", order: 2, sideAPoints: 30, sideBPoints: 5 }),
    unit({
      id: "p2",
      levelId: "point",
      parentId: "s1",
      order: 2,
      sideAPoints: 101,
      sideBPoints: 4,
    }),
  ];
  const moves: AdjustmentRow[] = [{ id: "a1", unitId: "r2", side: "SIDE_B", rule: teysse }];

  it("ends the unit the round it landed in belongs to", () => {
    const { units } = resolveMatch(CARDS, rows, moves);

    expect(units[0].children[0].endedBy?.name).toBe("تيس");
  });

  it("discards the ended unit rather than scoring it", () => {
    const { units } = resolveMatch(CARDS, rows, moves);

    expect(units[0].children[0].played.endedByRule).toBe(true);
    expect(units[0].standing?.unitsScored).toBe(1);
  });

  it("moves the score of the level above the one that ended", () => {
    const { units } = resolveMatch(CARDS, rows, moves);

    expect(units[0].standing?.sideBTotal).toBe(2);
    expect(units[0].standing?.sideATotal).toBe(-1);
  });

  it("leaves the point scoring where the rule does not end a unit", () => {
    const { units } = resolveMatch(CARDS, rows, [
      { ...moves[0], rule: { ...teysse, endsUnit: false } },
    ]);

    expect(units[0].children[0].endedBy).toBeNull();
    expect(units[0].children[0].played.endedByRule).toBe(false);
  });
});
