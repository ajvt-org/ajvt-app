import { describe, it, expect } from "vitest";
import {
  conditionHolds,
  detectedWorth,
  worthRuleProblem,
  type ClosedUnit,
  type WorthRuleShape,
} from "./unitWorth";

function closed(over: Partial<ClosedUnit> = {}): ClosedUnit {
  return {
    winner: "SIDE_A",
    over: true,
    sideAAtClose: 4,
    sideBAtClose: 0,
    sideALostCredit: false,
    sideBLostCredit: false,
    ...over,
  };
}

const ON_NOTHING: WorthRuleShape = {
  name: "قاعدة",
  levelId: "set",
  when: ["LOSER_ON_NOTHING"],
  worth: 2,
};

const FROM_BEHIND: WorthRuleShape = {
  name: "أخرى",
  levelId: "set",
  when: ["WINNER_LOST_CREDIT"],
  worth: 3,
};

const BOTH: WorthRuleShape = {
  name: "بيضاء",
  levelId: "set",
  when: ["LOSER_ON_NOTHING", "WINNER_LOST_CREDIT"],
  worth: 2,
};

describe("a unit whose loser was on nothing when the closing unit began", () => {
  it("holds where the loser had gained nothing at that point", () => {
    expect(conditionHolds(["LOSER_ON_NOTHING"], closed())).toBe(true);
  });

  it("holds even where the loser scored in the closing unit itself", () => {
    expect(conditionHolds(["LOSER_ON_NOTHING"], closed({ sideBAtClose: 0 }))).toBe(true);
  });

  it("does not hold where the loser was above nothing when it began", () => {
    expect(conditionHolds(["LOSER_ON_NOTHING"], closed({ sideBAtClose: 1 }))).toBe(false);
  });

  it("reads the other side where the other side won", () => {
    const other = closed({ winner: "SIDE_B", sideAAtClose: 0, sideBAtClose: 4 });

    expect(conditionHolds(["LOSER_ON_NOTHING"], other)).toBe(true);
  });
});

describe("a unit the winner took after losing its credit", () => {
  it("holds where the winner is the side that lost it", () => {
    expect(conditionHolds(["WINNER_LOST_CREDIT"], closed({ sideALostCredit: true }))).toBe(true);
  });

  it("does not hold where the loser is the side that lost it", () => {
    expect(conditionHolds(["WINNER_LOST_CREDIT"], closed({ sideBLostCredit: true }))).toBe(false);
  });
});

describe("a rule that holds both situations", () => {
  it("holds where the loser was on nothing", () => {
    expect(conditionHolds(BOTH.when, closed())).toBe(true);
  });

  it("holds where the winner is the side that lost its credit", () => {
    const behind = closed({ sideBAtClose: 3, sideALostCredit: true });

    expect(conditionHolds(BOTH.when, behind)).toBe(true);
  });

  it("holds neither where the unit answers to no situation", () => {
    expect(conditionHolds(BOTH.when, closed({ sideBAtClose: 3 }))).toBe(false);
  });

  it("leaves a rule of one situation silent on the other", () => {
    const behind = closed({ sideBAtClose: 3, sideALostCredit: true });

    expect(conditionHolds(ON_NOTHING.when, behind)).toBe(false);
    expect(conditionHolds(FROM_BEHIND.when, closed())).toBe(false);
  });
});

describe("a unit that is not decided", () => {
  it("holds no condition while it is still running", () => {
    expect(conditionHolds(["LOSER_ON_NOTHING"], closed({ over: false }))).toBe(false);
  });

  it("holds no condition where it ended level", () => {
    expect(conditionHolds(["LOSER_ON_NOTHING"], closed({ winner: null }))).toBe(false);
  });
});

describe("which rule a closed unit is worth", () => {
  it("takes the first declared rule whose condition holds", () => {
    expect(detectedWorth([ON_NOTHING, FROM_BEHIND], "set", closed())?.worth).toBe(2);
  });

  it("takes a rule of another kind where that is the one that holds", () => {
    const behind = closed({ sideBAtClose: 3, sideALostCredit: true });

    expect(detectedWorth([ON_NOTHING, FROM_BEHIND], "set", behind)?.name).toBe("أخرى");
  });

  it("takes nothing from a rule declared for another level", () => {
    expect(detectedWorth([ON_NOTHING], "match", closed())).toBeNull();
  });

  it("takes nothing where no condition holds", () => {
    expect(detectedWorth([ON_NOTHING, FROM_BEHIND], "set", closed({ sideBAtClose: 2 }))).toBeNull();
  });
});

describe("what a declared worth rule must say", () => {
  it("takes a name, a level, a condition and a number", () => {
    expect(worthRuleProblem(ON_NOTHING)).toBeNull();
  });

  it("wants a name and a level", () => {
    expect(worthRuleProblem({ ...ON_NOTHING, name: "  " })).toBe("name");
    expect(worthRuleProblem({ ...ON_NOTHING, levelId: "" })).toBe("level");
  });

  it("wants at least one situation and no situation it does not know", () => {
    expect(worthRuleProblem({ ...ON_NOTHING, when: [] })).toBe("when");
    expect(worthRuleProblem({ ...ON_NOTHING, when: ["NEVER"] as never })).toBe("when");
    expect(worthRuleProblem(BOTH)).toBeNull();
  });

  it("wants a number worth saying, and no more than the engine counts", () => {
    expect(worthRuleProblem({ ...ON_NOTHING, worth: 1 })).toBe("worth");
    expect(worthRuleProblem({ ...ON_NOTHING, worth: 11 })).toBe("worth");
    expect(worthRuleProblem({ ...ON_NOTHING, worth: 2.5 })).toBe("worth");
  });
});
