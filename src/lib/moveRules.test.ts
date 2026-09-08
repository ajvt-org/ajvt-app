import { describe, it, expect } from "vitest";
import { asMoves, ruleProblem } from "./moveRules";
import { deriveSeries, type SeriesRules } from "./matchSeries";

const TEYSSE = { name: "تيس", unitsToSelf: 2, unitsFromOther: 2 };

const COUNTED: SeriesRules = {
  ending: "FIRST_TO",
  unitsPerParent: 3,
  unitsToWin: 2,
  target: null,
  deciderTarget: null,
  bothPastTarget: null,
  extendsWhenLevel: false,
  extensionUnits: 2,
  startingCredit: 0,
  creditWindow: 0,
  halvesPerUnit: 2,
  decision: "SCORE",
  wonUnitWorth: 1,
  doubledWorth: 1,
  doublesOnBlankOpponent: false,
  doublesOnRecoveredCredit: false,
};

describe("what a tournament may declare", () => {
  it("takes a move worth two units either way", () => {
    expect(ruleProblem(TEYSSE)).toBeNull();
  });

  it("takes a move that only gives", () => {
    expect(ruleProblem({ ...TEYSSE, unitsFromOther: 0 })).toBeNull();
  });

  it("wants a name in the game's own words", () => {
    expect(ruleProblem({ ...TEYSSE, name: "  " })).toBe("name");
  });

  it("wants whole units that are not negative", () => {
    expect(ruleProblem({ ...TEYSSE, unitsToSelf: -1 })).toBe("units");
    expect(ruleProblem({ ...TEYSSE, unitsFromOther: 1.5 })).toBe("units");
  });

  it("refuses a move that does nothing", () => {
    expect(ruleProblem({ ...TEYSSE, unitsToSelf: 0, unitsFromOther: 0 })).toBe("noEffect");
  });
});

describe("what a match records", () => {
  it("turns a declared move into halves on each side", () => {
    expect(
      asMoves([{ order: 1, side: "SIDE_A", rule: { unitsToSelf: 2, unitsFromOther: 2 } }], 2),
    ).toEqual([{ order: 1, side: "SIDE_A", selfHalves: 4, otherHalves: 4 }]);
  });

  it("wins a match on its own", () => {
    const standing = deriveSeries(
      COUNTED,
      [{ order: 1, abandoned: true, outcome: null, sideAPoints: null, sideBPoints: null }],
      asMoves([{ order: 1, side: "SIDE_A", rule: TEYSSE }], 2),
    );

    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_A");
    expect(standing.sideATotal).toBe(4);
    expect(standing.sideBTotal).toBe(-4);
  });

  it("drives the other side below nothing", () => {
    const standing = deriveSeries(
      { ...COUNTED, unitsToWin: 3, unitsPerParent: 5 },
      [{ order: 1, abandoned: true, outcome: null, sideAPoints: null, sideBPoints: null }],
      asMoves([{ order: 1, side: "SIDE_B", rule: TEYSSE }], 2),
    );

    expect(standing.sideATotal).toBe(-4);
    expect(standing.over).toBe(false);
  });
});
