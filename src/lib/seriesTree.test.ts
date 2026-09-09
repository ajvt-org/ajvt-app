import { describe, it, expect } from "vitest";
import { nextOrderUnder, resolveMatch, type MoveRow, type UnitRow } from "./seriesTree";
import type { LevelRow } from "./matchLevels";

const BLANK: LevelRow = {
  id: "match",
  order: 0,
  singular: "المباراة",
  countedBy: null,
  endsBy: null,
  unitCount: null,
  target: null,
  unsettled: null,
  margin: null,
  continueUnits: null,
  deciderTarget: null,
  startingCredit: 0,
  creditWindow: 0,
};

const CARDS: LevelRow[] = [
  {
    ...BLANK,
    id: "match",
    order: 0,
    countedBy: "OUTCOME",
    endsBy: "COUNT",
    unitCount: 2,
    unsettled: "DECIDER",
  },
  {
    ...BLANK,
    id: "set",
    order: 1,
    singular: "شوط",
    countedBy: "OUTCOME",
    endsBy: "TARGET",
    target: 12,
  },
  {
    ...BLANK,
    id: "point",
    order: 2,
    singular: "نقطة",
    countedBy: "POINTS",
    endsBy: "TARGET",
    target: 100,
    unsettled: "CONTINUE",
    margin: 1,
    continueUnits: 1,
  },
  { ...BLANK, id: "round", order: 3, singular: "دور" },
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
    worthRuleId: null,
    worthKept: true,
    sideALostCredit: false,
    sideBLostCredit: false,
    ...over,
  };
}

describe("a unit with nothing under it", () => {
  it("keeps the result the admin typed", () => {
    const rows = [
      unit({ id: "s1", levelId: "set", order: 1, outcome: "SIDE_A" }),
      unit({ id: "s2", levelId: "set", order: 2, outcome: "SIDE_A" }),
    ];

    const { units, standing } = resolveMatch(CARDS, rows);

    expect(units[0].standing).toBeNull();
    expect(standing.winner).toBe("SIDE_A");
    expect(standing.over).toBe(true);
  });

  it("is a complete record rather than a broken one", () => {
    const rows = [unit({ id: "s1", levelId: "set", order: 1, outcome: "SIDE_A" })];

    const { standing } = resolveMatch(CARDS, rows);

    expect(standing.unitsRecorded).toBe(1);
    expect(standing.unitsScored).toBe(1);
    expect(standing.over).toBe(false);
  });
});

describe("a unit with something under it", () => {
  it("takes its score from its children rather than from what was typed", () => {
    const rows = [
      unit({ id: "s1", levelId: "set", order: 1, outcome: "SIDE_A" }),
      unit({ id: "p1", levelId: "point", parentId: "s1", order: 1, outcome: "SIDE_A" }),
      unit({ id: "p2", levelId: "point", parentId: "s1", order: 2, outcome: "SIDE_B" }),
    ];

    const { units } = resolveMatch(CARDS, rows);

    expect(units[0].standing?.sideATotal).toBe(2);
    expect(units[0].standing?.sideBTotal).toBe(2);
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
    expect(units[0].standing?.sideATotal).toBe(2);
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
    levelId: "set",
    endsUnit: false,
    unitWorth: null,
  };

  it("swings the level above the unit it sits in, before that unit is scored", () => {
    const rows = [unit({ id: "s1", levelId: "set", order: 1, outcome: "SIDE_A" })];
    const moves: MoveRow[] = [{ id: "a1", unitId: "s1", side: "SIDE_B", rule }];

    const { standing } = resolveMatch(CARDS, rows, moves);

    expect(standing.sideBTotal).toBe(2);
    expect(standing.sideATotal).toBe(0);
    expect(standing.over).toBe(false);
  });

  it("takes a side below nothing rather than flooring at zero", () => {
    const rows = [unit({ id: "s1", levelId: "set", order: 1, outcome: "SIDE_B" })];
    const moves: MoveRow[] = [{ id: "a1", unitId: "s1", side: "SIDE_B", rule }];

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
        outcome: "SIDE_A",
        sideBLostCredit: true,
      }),
    ];

    const { units } = resolveMatch(CREDITED, rows);

    expect(units[0].children[0].played.sideBLostCredit).toBe(true);
  });
});

describe("what a won unit is worth", () => {
  it("counts one where nothing marked it as more", () => {
    const rows = [
      unit({ id: "s1", levelId: "set", order: 1 }),
      unit({ id: "p1", levelId: "point", parentId: "s1", order: 1, outcome: "SIDE_A" }),
    ];

    const { units } = resolveMatch(CARDS, rows);

    expect(units[0].standing?.sideATotal).toBe(2);
  });

  it("takes the worth marked on the row", () => {
    const rows = [
      unit({ id: "s1", levelId: "set", order: 1 }),
      unit({
        id: "p1",
        levelId: "point",
        parentId: "s1",
        order: 1,
        outcome: "SIDE_A",
        worth: 2,
      }),
    ];

    const { units } = resolveMatch(CARDS, rows);

    expect(units[0].standing?.sideATotal).toBe(4);
  });

  it("counts a unit by what a marked move says it is worth", () => {
    const white = {
      id: "white",
      name: "أبيض",
      unitsToSelf: 0,
      unitsFromOther: 0,
      levelId: "point",
      endsUnit: false,
      unitWorth: 2,
    };
    const rows = [
      unit({ id: "s1", levelId: "set", order: 1 }),
      unit({ id: "p1", levelId: "point", parentId: "s1", order: 1, outcome: "SIDE_A" }),
    ];

    const { units } = resolveMatch(CARDS, rows, [
      { id: "m1", unitId: "p1", side: "SIDE_A", rule: white },
    ]);

    expect(units[0].standing?.sideATotal).toBe(4);
  });

  it("counts a unit by one where the move was never marked on it", () => {
    const rows = [
      unit({ id: "s1", levelId: "set", order: 1 }),
      unit({ id: "p1", levelId: "point", parentId: "s1", order: 1, outcome: "SIDE_A" }),
      unit({ id: "p2", levelId: "point", parentId: "s1", order: 2, outcome: "SIDE_A" }),
    ];

    const { units } = resolveMatch(CARDS, rows);

    expect(units[0].standing?.sideATotal).toBe(4);
  });

  it("carries the worth of a point that was played out of its rounds", () => {
    const rows = [
      unit({ id: "s1", levelId: "set", order: 1 }),
      unit({ id: "p1", levelId: "point", parentId: "s1", order: 1, worth: 2 }),
      unit({
        id: "r1",
        levelId: "round",
        parentId: "p1",
        order: 1,
        sideAPoints: 101,
        sideBPoints: 20,
      }),
    ];

    const { units } = resolveMatch(CARDS, rows);

    expect(units[0].standing?.sideATotal).toBe(4);
  });
});

describe("the deciding unit of a level", () => {
  const SHORT = CARDS.map((level) => (level.id === "set" ? { ...level, target: 2 } : level));
  const DECIDED = SHORT.map((level) =>
    level.id === "set" ? { ...level, deciderTarget: 3 } : level,
  );

  function sets(results: ("SIDE_A" | "SIDE_B")[][]) {
    return results.flatMap((points, index) => [
      unit({ id: `s${index + 1}`, levelId: "set", order: index + 1 }),
      ...points.map((side, at) =>
        unit({
          id: `s${index + 1}p${at + 1}`,
          levelId: "point",
          parentId: `s${index + 1}`,
          order: at + 1,
          outcome: side,
        }),
      ),
    ]);
  }

  it("plays to the ordinary number while the level above is not level", () => {
    const rows = sets([["SIDE_A", "SIDE_A"]]);

    const { units } = resolveMatch(DECIDED, rows);

    expect(units[0].decider).toBe(false);
    expect(units[0].standing?.over).toBe(true);
    expect(units[0].standing?.target).toBe(4);
  });

  it("plays to its own number when the level above is level after the others", () => {
    const rows = sets([
      ["SIDE_A", "SIDE_A"],
      ["SIDE_B", "SIDE_B"],
      ["SIDE_A", "SIDE_A"],
    ]);

    const { units } = resolveMatch(DECIDED, rows);

    expect(units[2].decider).toBe(true);
    expect(units[2].standing?.target).toBe(6);
    expect(units[2].standing?.over).toBe(false);
  });

  it("uses the ordinary number where the level declares no second one", () => {
    const rows = sets([
      ["SIDE_A", "SIDE_A"],
      ["SIDE_B", "SIDE_B"],
      ["SIDE_A", "SIDE_A"],
    ]);

    const { units } = resolveMatch(SHORT, rows);

    expect(units[2].standing?.target).toBe(4);
    expect(units[2].standing?.over).toBe(true);
  });

  it("is not played where the level above settles inside its count", () => {
    const rows = sets([
      ["SIDE_A", "SIDE_A"],
      ["SIDE_A", "SIDE_A"],
    ]);

    const { standing } = resolveMatch(DECIDED, rows);

    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_A");
    expect(standing.unitsLeft).toBe(0);
  });

  it("is the only one, however many units follow it", () => {
    const rows = sets([
      ["SIDE_A", "SIDE_A"],
      ["SIDE_B", "SIDE_B"],
      ["SIDE_A", "SIDE_A"],
      ["SIDE_B", "SIDE_B"],
    ]);

    const { units } = resolveMatch(DECIDED, rows);

    expect(units.map((one) => one.decider)).toEqual([false, false, true, false]);
  });

  it("is played where a level ending at a number leaves both sides past it", () => {
    const ladder = CARDS.map((level) =>
      level.id === "point" ? { ...level, unsettled: "DECIDER" as const } : level,
    );
    const rows = [
      unit({ id: "s1", levelId: "set", order: 1 }),
      unit({ id: "p1", levelId: "point", parentId: "s1", order: 1 }),
      unit({
        id: "r1",
        levelId: "round",
        parentId: "p1",
        order: 1,
        sideAPoints: 60,
        sideBPoints: 60,
      }),
      unit({
        id: "r2",
        levelId: "round",
        parentId: "p1",
        order: 2,
        sideAPoints: 45,
        sideBPoints: 45,
      }),
      unit({
        id: "r3",
        levelId: "round",
        parentId: "p1",
        order: 3,
        sideAPoints: 10,
        sideBPoints: 0,
      }),
    ];

    const { units } = resolveMatch(ladder, rows);
    const rounds = units[0].children[0].children;

    expect(rounds.map((one) => one.decider)).toEqual([false, false, true]);
    expect(units[0].children[0].standing?.winner).toBe("SIDE_A");
  });
});

describe("a rule that ends the unit it acts on", () => {
  const teysse = {
    id: "teysse",
    name: "تيس",
    unitsToSelf: 2,
    unitsFromOther: 2,
    levelId: "point",
    endsUnit: true,
    unitWorth: null,
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
    unit({ id: "p2", levelId: "point", parentId: "s1", order: 2, outcome: "SIDE_A" }),
  ];
  const moves: MoveRow[] = [{ id: "a1", unitId: "p1", side: "SIDE_B", rule: teysse }];

  it("ends the unit it names rather than the one above it", () => {
    const { units } = resolveMatch(CARDS, rows, moves);

    expect(units[0].children[0].endedBy?.name).toBe("تيس");
    expect(units[0].endedBy).toBeNull();
  });

  it("discards the ended unit rather than scoring it", () => {
    const { units } = resolveMatch(CARDS, rows, moves);

    expect(units[0].children[0].played.endedByRule).toBe(true);
    expect(units[0].standing?.unitsScored).toBe(1);
  });

  it("moves the score of the level above the one that ended", () => {
    const { units } = resolveMatch(CARDS, rows, moves);

    expect(units[0].standing?.sideBTotal).toBe(4);
    expect(units[0].standing?.sideATotal).toBe(-2);
  });

  it("leaves the unit scoring where the rule does not end one", () => {
    const { units } = resolveMatch(CARDS, rows, [
      { ...moves[0], rule: { ...teysse, endsUnit: false } },
    ]);

    expect(units[0].children[0].endedBy).toBeNull();
    expect(units[0].children[0].played.endedByRule).toBe(false);
  });

  it("takes a total below nothing rather than flooring it at zero", () => {
    const { units } = resolveMatch(CARDS, [rows[0], rows[1], rows[2], rows[3]], moves);

    expect(units[0].standing?.sideATotal).toBe(-4);
    expect(units[0].standing?.sideBTotal).toBe(4);
  });
});

describe("a ladder of one level", () => {
  const ALONE: LevelRow[] = [{ ...BLANK, id: "match" }];

  it("takes one unit and nothing more", () => {
    const { standing } = resolveMatch(ALONE, []);

    expect(standing.unitsAllowed).toBe(1);
    expect(standing.unitsLeft).toBe(1);
    expect(standing.over).toBe(false);
    expect(standing.extending).toBe(false);
  });

  it("is over once that unit carries a winner", () => {
    const rows = [unit({ id: "u1", levelId: "match", order: 1, outcome: "SIDE_A" })];

    const { standing } = resolveMatch(ALONE, rows);

    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_A");
    expect(standing.unitsLeft).toBe(0);
  });

  it("is over and level once that unit is drawn", () => {
    const rows = [unit({ id: "u1", levelId: "match", order: 1, outcome: "DRAW" })];

    const { standing } = resolveMatch(ALONE, rows);

    expect(standing.over).toBe(true);
    expect(standing.winner).toBeNull();
    expect(standing.level).toBe(true);
  });
});
