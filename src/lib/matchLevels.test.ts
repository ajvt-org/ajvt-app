import { describe, it, expect } from "vitest";
import {
  parentOfLevel,
  recordingUnder,
  recordsOnItself,
  scorelineUnits,
  type Ladder,
  type LevelRow,
} from "./matchLevels";

const BLANK: LevelRow = {
  id: "match",
  order: 0,
  singular: "المباراة",
  plural: "المباريات",
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

const ONE: Ladder = [{ ...BLANK, id: "match" }];

const TWO: Ladder = [
  { ...BLANK, id: "match", countedBy: "OUTCOME", endsBy: "COUNT", unitCount: 2 },
  { ...BLANK, id: "game", order: 1, singular: "لعبة", plural: "ألعاب" },
];

describe("where a result is recorded", () => {
  it("records a ladder of one level on the match itself", () => {
    expect(recordsOnItself(ONE)).toBe(true);
    expect(recordingUnder(ONE, 0)).toEqual({ level: ONE[0], parent: ONE[0] });
  });

  it("takes nothing under that one level", () => {
    expect(recordingUnder(ONE, 1)).toBeNull();
  });

  it("records a deeper ladder on the level under the one that governs it", () => {
    expect(recordsOnItself(TWO)).toBe(false);
    expect(recordingUnder(TWO, 0)).toEqual({ level: TWO[1], parent: TWO[0] });
  });

  it("stops at the leaf of a deeper ladder", () => {
    expect(recordingUnder(TWO, 1)).toBeNull();
    expect(recordingUnder(TWO, 2)).toBeNull();
  });
});

describe("which level shapes a recorded unit", () => {
  it("reads a one level ladder against that level", () => {
    expect(parentOfLevel(ONE, "match")).toEqual(ONE[0]);
  });

  it("reads a deeper ladder against the level above", () => {
    expect(parentOfLevel(TWO, "game")).toEqual(TWO[0]);
  });

  it("gives nothing for the top of a deeper ladder or for a level that has gone", () => {
    expect(parentOfLevel(TWO, "match")).toBeNull();
    expect(parentOfLevel(TWO, "elsewhere")).toBeNull();
  });
});

describe("what the scoreline marks", () => {
  it("marks nothing where the one unit is the match", () => {
    expect(scorelineUnits(ONE, [{ id: "u1" }])).toEqual([]);
  });

  it("marks every unit of a deeper ladder", () => {
    const units = [{ id: "u1" }, { id: "u2" }];
    expect(scorelineUnits(TWO, units)).toEqual(units);
  });
});
