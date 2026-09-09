import { describe, it, expect } from "vitest";
import { colourProblem, ladderProblem } from "./seriesSetup";
import type { LevelRow } from "./matchLevels";

const BLANK: LevelRow = {
  id: "one",
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

const match: LevelRow = {
  ...BLANK,
  countedBy: "OUTCOME",
  endsBy: "COUNT",
  unitCount: 2,
  unsettled: "DRAW",
};

const game: LevelRow = { ...BLANK, id: "two", order: 1, singular: "لعبة" };

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

  it("wants a name on every level", () => {
    expect(fault([match, { ...game, singular: " " }])).toBe("words");
  });

  it("wants to know how the units under a level are counted", () => {
    expect(fault([{ ...match, countedBy: null }, game])).toBe("countedBy");
  });

  it("wants to know when a level ends", () => {
    expect(fault([{ ...match, endsBy: null }, game])).toBe("endsBy");
  });

  it("wants a count of the units a level plays", () => {
    expect(fault([{ ...match, unitCount: 0 }, game])).toBe("unitCountMissing");
  });

  it("refuses rules on the level that is recorded", () => {
    expect(fault([match, { ...game, endsBy: "COUNT", unitCount: 2 }])).toBe("rulesOnTheLastLevel");
  });
});

describe("a ladder that is one level", () => {
  const alone: LevelRow = { ...BLANK, singular: "مباراة" };

  it("takes a match that says nothing about itself, which is every one declared so far", () => {
    expect(ladderProblem([alone])).toBeNull();
  });

  it("takes a match counted by the points of the one game it is", () => {
    expect(ladderProblem([{ ...alone, countedBy: "POINTS" }])).toBeNull();
  });

  it("takes a match counted by who won it", () => {
    expect(ladderProblem([{ ...alone, countedBy: "OUTCOME" }])).toBeNull();
  });

  it("still wants a name on it", () => {
    expect(fault([{ ...alone, singular: " " }])).toBe("words");
  });

  it("refuses a count of units on it, since it is the unit", () => {
    expect(fault([{ ...alone, endsBy: "COUNT", unitCount: 2 }])).toBe("rulesOnTheLastLevel");
  });

  it("refuses a number that ends it", () => {
    expect(fault([{ ...alone, endsBy: "TARGET", target: 100 }])).toBe("rulesOnTheLastLevel");
  });

  it("refuses what happens when it is not settled", () => {
    expect(fault([{ ...alone, unsettled: "CONTINUE", margin: 1 }])).toBe("rulesOnTheLastLevel");
  });

  it("refuses a starting credit on it", () => {
    expect(fault([{ ...alone, startingCredit: 26, creditWindow: 2 }])).toBe("rulesOnTheLastLevel");
  });

  it("refuses the number of a deciding unit on it", () => {
    expect(fault([{ ...alone, deciderTarget: 24 }])).toBe("rulesOnTheLastLevel");
  });

  it("leaves the last level of a deeper ladder holding nothing at all", () => {
    expect(fault([match, { ...game, countedBy: "POINTS" }])).toBe("rulesOnTheLastLevel");
  });
});

describe("a level that ends at a number", () => {
  const past: LevelRow = {
    ...match,
    countedBy: "POINTS",
    endsBy: "TARGET",
    unitCount: null,
    target: 100,
    unsettled: "CONTINUE",
    margin: 1,
    continueUnits: 1,
  };

  it("takes the number and what happens when it is not settled", () => {
    expect(ladderProblem([past, game])).toBeNull();
  });

  it("wants the number", () => {
    expect(fault([{ ...past, target: null }, game])).toBe("targetMissing");
  });

  it("needs no ceiling on the units under it", () => {
    expect(ladderProblem([{ ...past, unitCount: null }, game])).toBeNull();
  });

  it("takes a number counted by the outcomes under it", () => {
    const dozen: LevelRow = { ...past, countedBy: "OUTCOME", target: 12, unsettled: null };
    expect(ladderProblem([dozen, game])).toBeNull();
  });
});

describe("a level that is continued while it stays unsettled", () => {
  const knockout: LevelRow = { ...match, unsettled: "CONTINUE", margin: 1, continueUnits: 2 };

  it("takes the margin and the units it continues by", () => {
    expect(ladderProblem([knockout, game])).toBeNull();
  });

  it("wants the margin", () => {
    expect(fault([{ ...knockout, margin: null }, game])).toBe("marginMissing");
  });

  it("wants the units it continues by", () => {
    expect(fault([{ ...knockout, continueUnits: null }, game])).toBe("continueUnitsMissing");
  });

  it("asks a level played to a target for the margin alone", () => {
    const target: LevelRow = {
      ...knockout,
      endsBy: "TARGET",
      unitCount: null,
      target: 100,
      continueUnits: null,
    };

    expect(ladderProblem([target, game])).toBeNull();
    expect(fault([{ ...target, margin: null }, game])).toBe("marginMissing");
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

  it("refuses a window wider than the units a level counts out", () => {
    expect(fault([{ ...credited, creditWindow: 5 }, game])).toBe("creditWindowTooWide");
  });
});

describe("the number of a deciding unit", () => {
  it("is refused on a level that does not end at a number", () => {
    expect(fault([{ ...match, deciderTarget: 24 }, game])).toBe("deciderTargetWithoutATarget");
  });

  it("sits on the level whose number it changes", () => {
    const dozen: LevelRow = {
      ...match,
      endsBy: "TARGET",
      unitCount: null,
      target: 12,
      unsettled: null,
      deciderTarget: 24,
    };
    expect(ladderProblem([dozen, game])).toBeNull();
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
