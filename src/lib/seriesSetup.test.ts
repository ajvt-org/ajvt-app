import { describe, it, expect } from "vitest";
import { colourProblem, ladderProblem } from "./seriesSetup";
import type { LevelRow } from "./matchLevels";

const BLANK: LevelRow = {
  id: "one",
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

const match: LevelRow = { ...BLANK, ending: "PLAY_ALL", unitsPerParent: 2 };
const game: LevelRow = {
  ...BLANK,
  id: "two",
  order: 1,
  singular: "لعبة",
  plural: "ألعاب",
  decision: "OUTCOME",
};

const chess = [match, game];

const fault = (ladder: LevelRow[]) => {
  const problem = ladderProblem(ladder);
  return typeof problem === "string" || problem === null ? problem : problem.problem;
};

describe("what a ladder may be set up as", () => {
  it("takes a match and one level under it", () => {
    expect(ladderProblem(chess)).toBeNull();
  });

  it("wants at least one level", () => {
    expect(fault([])).toBe("noLevels");
  });

  it("wants a singular and a plural on every level", () => {
    expect(fault([match, { ...game, plural: "  " }])).toBe("words");
  });

  it("wants to know how a level that has units under it ends", () => {
    expect(fault([{ ...match, ending: null }, game])).toBe("ending");
  });

  it("wants a count of the units a level holds", () => {
    expect(fault([{ ...match, unitsPerParent: 0 }, game])).toBe("unitsPerParent");
  });

  it("refuses an ending on the level that is recorded", () => {
    expect(fault([match, { ...game, ending: "PLAY_ALL" }])).toBe("endingOnTheLastLevel");
  });

  it("refuses a recording decision on the match itself", () => {
    expect(fault([{ ...match, decision: "OUTCOME" }, game])).toBe("decision");
  });

  it("wants a recording decision on every level under the match", () => {
    expect(fault([match, { ...game, decision: null }])).toBe("decision");
  });
});

describe("a level that ends on a count of units", () => {
  const counted: LevelRow = { ...match, ending: "FIRST_TO", unitsPerParent: 3, unitsToWin: 2 };

  it("takes the count", () => {
    expect(ladderProblem([counted, game])).toBeNull();
  });

  it("wants the count", () => {
    expect(fault([{ ...counted, unitsToWin: null }, game])).toBe("unitsToWinMissing");
  });

  it("refuses a count it cannot reach", () => {
    expect(fault([{ ...counted, unitsToWin: 4 }, game])).toBe("unitsToWinUnreachable");
  });

  it("refuses a scored total beside it", () => {
    expect(fault([{ ...counted, target: 100 }, game])).toBe("targetUnused");
  });
});

describe("a level that ends past a total", () => {
  const past: LevelRow = {
    ...match,
    ending: "FIRST_PAST",
    unitsPerParent: 20,
    target: 100,
    bothPastTarget: "PLAY_ON",
  };
  const round: LevelRow = { ...game, decision: "SCORE" };

  it("takes the total and what happens when both pass it", () => {
    expect(ladderProblem([past, round])).toBeNull();
  });

  it("wants the total", () => {
    expect(fault([{ ...past, target: null }, round])).toBe("targetMissing");
  });

  it("wants to know what happens when both sides pass it", () => {
    expect(fault([{ ...past, bothPastTarget: null }, round])).toBe("bothPastTargetUnused");
  });

  it("refuses a total with no scored level under it", () => {
    expect(fault([past, { ...round, decision: "OUTCOME" }])).toBe("targetWithoutAScoredLevel");
  });
});

describe("a starting credit", () => {
  const credited: LevelRow = { ...match, startingCredit: 26, creditWindow: 2 };

  it("takes the credit and the window it is earned in", () => {
    expect(ladderProblem([credited, game])).toBeNull();
  });

  it("wants a window when there is a credit", () => {
    expect(fault([{ ...credited, creditWindow: 0 }, game])).toBe("creditWithoutAWindow");
  });

  it("refuses a window wider than the units that exist", () => {
    expect(fault([{ ...credited, creditWindow: 5 }, game])).toBe("creditWindowTooWide");
  });
});

describe("a decider target", () => {
  it("is refused on a level that plays all of its units", () => {
    expect(fault([{ ...match, deciderTarget: 24 }, game])).toBe("deciderTargetOnPlayAll");
  });
});

describe("an extension", () => {
  it("wants a count of the units it adds", () => {
    expect(fault([{ ...match, extendsWhenLevel: true }, game])).toBe("extensionUnits");
  });
});

describe("the colour words", () => {
  it("are wanted when a tournament has colours", () => {
    expect(
      colourProblem({ hasColours: true, firstColourWord: "أبيض", secondColourWord: null }),
    ).toBe("colourWords");
  });

  it("are not wanted when it has none", () => {
    expect(
      colourProblem({ hasColours: false, firstColourWord: null, secondColourWord: null }),
    ).toBeNull();
  });
});
