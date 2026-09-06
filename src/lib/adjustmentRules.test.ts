import { describe, it, expect } from "vitest";
import { asAdjustments, ruleProblem } from "./adjustmentRules";
import { deriveSeries, type SeriesRules } from "./matchSeries";

const TEYSSE = { name: "تيس", partsToSelf: 2, partsFromOther: 2 };

const MARYASS: SeriesRules = {
  partsPerMatch: 3,
  matchEnding: "FIRST_TO",
  partsToWin: 2,
  partDecision: "POINTS",
  extendsWhenLevel: false,
};

describe("what a tournament may declare", () => {
  it("takes a move worth two parts either way", () => {
    expect(ruleProblem(TEYSSE)).toBeNull();
  });

  it("takes a move that only gives", () => {
    expect(ruleProblem({ ...TEYSSE, partsFromOther: 0 })).toBeNull();
  });

  it("wants a name in the game's own words", () => {
    expect(ruleProblem({ ...TEYSSE, name: "  " })).toBe("name");
  });

  it("wants whole parts that are not negative", () => {
    expect(ruleProblem({ ...TEYSSE, partsToSelf: -1 })).toBe("parts");
    expect(ruleProblem({ ...TEYSSE, partsFromOther: 1.5 })).toBe("parts");
  });

  it("refuses a move that does nothing", () => {
    expect(ruleProblem({ ...TEYSSE, partsToSelf: 0, partsFromOther: 0 })).toBe("noEffect");
  });
});

describe("what a match records", () => {
  it("turns a declared move into whole parts on each side", () => {
    expect(
      asAdjustments([{ order: 1, side: "SIDE_A", rule: { partsToSelf: 2, partsFromOther: 2 } }]),
    ).toEqual([{ order: 1, side: "SIDE_A", selfHalves: 4, otherHalves: 4 }]);
  });

  it("wins a maryass match on its own", () => {
    const standing = deriveSeries(
      MARYASS,
      [{ order: 1, abandoned: true, outcome: null, sideAPoints: null, sideBPoints: null }],
      asAdjustments([{ order: 1, side: "SIDE_A", rule: TEYSSE }]),
    );

    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_A");
    expect(standing.sideAHalves).toBe(4);
    expect(standing.sideBHalves).toBe(-4);
  });

  it("drives the other side below nothing", () => {
    const standing = deriveSeries(
      { ...MARYASS, partsToWin: 3, partsPerMatch: 5 },
      [{ order: 1, abandoned: true, outcome: null, sideAPoints: null, sideBPoints: null }],
      asAdjustments([{ order: 1, side: "SIDE_B", rule: TEYSSE }]),
    );

    expect(standing.sideAHalves).toBe(-4);
    expect(standing.over).toBe(false);
  });
});
