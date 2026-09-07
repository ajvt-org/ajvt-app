import { describe, it, expect } from "vitest";
import {
  deriveSeries,
  nextUnitOrder,
  targetHalves,
  type PlayedUnit,
  type RecordedAdjustment,
  type SeriesRules,
} from "./matchSeries";

const BASE: SeriesRules = {
  ending: "PLAY_ALL",
  unitsPerParent: 2,
  unitsToWin: null,
  target: null,
  deciderTarget: null,
  bothPastTarget: null,
  extendsWhenLevel: false,
  extensionUnits: 2,
  startingCredit: 0,
  creditWindow: 0,
  halvesPerUnit: 2,
  decision: "OUTCOME",
  wonUnitWorth: 1,
  doubledWorth: 1,
  doublesOnBlankOpponent: false,
  doublesOnRecoveredCredit: false,
};

const CHESS: SeriesRules = BASE;

const COUNTED: SeriesRules = {
  ...BASE,
  ending: "FIRST_TO",
  unitsPerParent: 3,
  unitsToWin: 2,
  decision: "SCORE",
};

function won(order: number, side: "SIDE_A" | "SIDE_B"): PlayedUnit {
  return { order, abandoned: false, outcome: side, sideAPoints: null, sideBPoints: null };
}

function drawn(order: number): PlayedUnit {
  return { order, abandoned: false, outcome: "DRAW", sideAPoints: null, sideBPoints: null };
}

function scored(order: number, a: number, b: number): PlayedUnit {
  return { order, abandoned: false, outcome: null, sideAPoints: a, sideBPoints: b };
}

function abandoned(order: number): PlayedUnit {
  return { order, abandoned: true, outcome: null, sideAPoints: null, sideBPoints: null };
}

function teysse(order: number, side: "SIDE_A" | "SIDE_B"): RecordedAdjustment {
  return { order, side, selfHalves: 4, otherHalves: 4 };
}

describe("a match played out in full", () => {
  it("stands at nothing before a part is recorded", () => {
    const standing = deriveSeries(CHESS, []);

    expect(standing.sideATotal).toBe(0);
    expect(standing.sideBTotal).toBe(0);
    expect(standing.over).toBe(false);
    expect(standing.unitsLeft).toBe(2);
  });

  it("gives a whole part to the side that won it", () => {
    const standing = deriveSeries(CHESS, [won(1, "SIDE_A")]);

    expect(standing.sideATotal).toBe(2);
    expect(standing.sideBTotal).toBe(0);
    expect(standing.over).toBe(false);
  });

  it("splits a drawn part in half", () => {
    const standing = deriveSeries(CHESS, [drawn(1)]);

    expect(standing.sideATotal).toBe(1);
    expect(standing.sideBTotal).toBe(1);
  });

  it("is over when every part has been recorded", () => {
    const standing = deriveSeries(CHESS, [won(1, "SIDE_A"), drawn(2)]);

    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_A");
    expect(standing.sideATotal).toBe(3);
    expect(standing.sideBTotal).toBe(1);
  });

  it("ends level when the two sides finish equal", () => {
    const standing = deriveSeries(CHESS, [drawn(1), drawn(2)]);

    expect(standing.over).toBe(true);
    expect(standing.level).toBe(true);
    expect(standing.winner).toBeNull();
  });
});

describe("a match that stops when one side has enough", () => {
  it("carries the target it has to reach", () => {
    expect(targetHalves(COUNTED)).toBe(4);
    expect(targetHalves(CHESS)).toBeNull();
  });

  it("gives a part to whoever scored more inside it", () => {
    const standing = deriveSeries(COUNTED, [scored(1, 101, 74)]);

    expect(standing.sideATotal).toBe(2);
    expect(standing.over).toBe(false);
  });

  it("stops as soon as a side reaches the target", () => {
    const standing = deriveSeries(COUNTED, [scored(1, 101, 74), scored(2, 100, 60)]);

    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_A");
    expect(standing.unitsLeft).toBe(1);
  });

  it("does not count a part played after the match was already over", () => {
    const standing = deriveSeries(COUNTED, [
      scored(1, 101, 74),
      scored(2, 100, 60),
      scored(3, 10, 100),
    ]);

    expect(standing.sideBTotal).toBe(0);
    expect(standing.unitsRecorded).toBe(2);
  });
});

describe("an abandoned part", () => {
  it("scores nothing for either side", () => {
    const standing = deriveSeries(CHESS, [abandoned(1)]);

    expect(standing.sideATotal).toBe(0);
    expect(standing.sideBTotal).toBe(0);
  });

  it("still counts as one of the parts the match holds", () => {
    const standing = deriveSeries(CHESS, [won(1, "SIDE_A"), abandoned(2)]);

    expect(standing.unitsRecorded).toBe(2);
    expect(standing.unitsScored).toBe(1);
    expect(standing.over).toBe(true);
  });
});

describe("an adjustment", () => {
  it("swings both sides at once", () => {
    const standing = deriveSeries(CHESS, [], [teysse(1, "SIDE_A")]);

    expect(standing.sideATotal).toBe(4);
    expect(standing.sideBTotal).toBe(-4);
  });

  it("drives a side below nothing rather than flooring at zero", () => {
    const standing = deriveSeries(COUNTED, [scored(1, 101, 74)], [teysse(2, "SIDE_B")]);

    expect(standing.sideATotal).toBe(-2);
    expect(standing.sideBTotal).toBe(4);
  });

  it("wins the match on its own when the swing reaches the target", () => {
    const standing = deriveSeries(COUNTED, [abandoned(1)], [teysse(1, "SIDE_A")]);

    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_A");
    expect(standing.unitsLeft).toBe(3);
  });

  it("lands before the part it happened in, which scores nothing anyway", () => {
    const standing = deriveSeries(
      { ...COUNTED, unitsToWin: 3 },
      [scored(1, 101, 20), abandoned(2)],
      [teysse(2, "SIDE_B")],
    );

    expect(standing.sideATotal).toBe(-2);
    expect(standing.sideBTotal).toBe(4);
    expect(standing.over).toBe(false);
  });

  it("takes one from each side and leaves them where they started", () => {
    const standing = deriveSeries(
      { ...COUNTED, unitsToWin: 3, unitsPerParent: 5 },
      [abandoned(1), abandoned(2)],
      [teysse(1, "SIDE_A"), teysse(2, "SIDE_B")],
    );

    expect(standing.sideATotal).toBe(0);
    expect(standing.sideBTotal).toBe(0);
  });

  it("takes two by one side to a win", () => {
    const standing = deriveSeries(
      { ...COUNTED, unitsToWin: 4, unitsPerParent: 5 },
      [abandoned(1), abandoned(2)],
      [teysse(1, "SIDE_A"), teysse(2, "SIDE_A")],
    );

    expect(standing.sideATotal).toBe(8);
    expect(standing.sideBTotal).toBe(-8);
    expect(standing.winner).toBe("SIDE_A");
  });

  it("is walked in order with the parts rather than added on at the end", () => {
    const early = deriveSeries(
      { ...COUNTED, unitsToWin: 2, unitsPerParent: 4 },
      [abandoned(1), scored(2, 100, 10), scored(3, 100, 10)],
      [teysse(1, "SIDE_B")],
    );

    expect(early.winner).toBe("SIDE_B");
    expect(early.unitsRecorded).toBe(0);
  });
});

describe("the next unit order", () => {
  it("starts at one", () => {
    expect(nextUnitOrder([])).toBe(1);
  });

  it("follows the highest order recorded", () => {
    expect(nextUnitOrder([won(1, "SIDE_A"), abandoned(3)])).toBe(4);
  });
});

describe("a level knockout match", () => {
  const KNOCKOUT = { ...CHESS, extendsWhenLevel: true };

  it("stands as a result in a group stage", () => {
    const standing = deriveSeries(CHESS, [drawn(1), drawn(2)]);

    expect(standing.over).toBe(true);
    expect(standing.level).toBe(true);
    expect(standing.extending).toBe(false);
  });

  it("is extended by another pair rather than left level", () => {
    const standing = deriveSeries(KNOCKOUT, [drawn(1), drawn(2)]);

    expect(standing.over).toBe(false);
    expect(standing.extending).toBe(true);
    expect(standing.unitsAllowed).toBe(4);
    expect(standing.unitsLeft).toBe(2);
  });

  it("is extended again while it stays level", () => {
    const standing = deriveSeries(KNOCKOUT, [drawn(1), drawn(2), drawn(3), drawn(4)]);

    expect(standing.unitsAllowed).toBe(6);
    expect(standing.over).toBe(false);
  });

  it("stops as soon as the extension breaks the tie", () => {
    const standing = deriveSeries(KNOCKOUT, [drawn(1), drawn(2), won(3, "SIDE_A"), drawn(4)]);

    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_A");
    expect(standing.extending).toBe(true);
  });

  it("is not extended when one side is already ahead", () => {
    const standing = deriveSeries(KNOCKOUT, [won(1, "SIDE_A"), drawn(2)]);

    expect(standing.over).toBe(true);
    expect(standing.extending).toBe(false);
  });
});

describe("a level whose units are scored past a total", () => {
  const SCORED: SeriesRules = {
    ...BASE,
    ending: "FIRST_PAST",
    unitsPerParent: 20,
    target: 100,
    bothPastTarget: "HIGHER_TOTAL",
    decision: "SCORE",
    halvesPerUnit: 1,
  };

  it("adds up what the units under it scored", () => {
    const standing = deriveSeries(SCORED, [scored(1, 30, 12), scored(2, 25, 40)]);

    expect(standing.sideATotal).toBe(55);
    expect(standing.sideBTotal).toBe(52);
    expect(standing.scored).toBe(true);
    expect(standing.over).toBe(false);
  });

  it("ends when a side passes the total", () => {
    const standing = deriveSeries(SCORED, [scored(1, 60, 12), scored(2, 45, 40)]);

    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_A");
  });

  it("gives it to the higher total when both sides pass together", () => {
    const standing = deriveSeries(SCORED, [scored(1, 101, 104)]);

    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_B");
  });

  it("plays another unit when both are past and level", () => {
    const standing = deriveSeries({ ...SCORED, bothPastTarget: "PLAY_ON" }, [scored(1, 101, 101)]);

    expect(standing.over).toBe(false);
    expect(standing.winner).toBeNull();
  });

  it("stops level when the tie is not played on", () => {
    const standing = deriveSeries(SCORED, [scored(1, 101, 101)]);

    expect(standing.over).toBe(true);
    expect(standing.level).toBe(true);
    expect(standing.winner).toBeNull();
  });
});

describe("the extension count", () => {
  it("comes off the level rather than a constant", () => {
    const rules = { ...CHESS, extendsWhenLevel: true, extensionUnits: 3 };
    const standing = deriveSeries(rules, [drawn(1), drawn(2)]);

    expect(standing.unitsAllowed).toBe(5);
    expect(standing.unitsLeft).toBe(3);
  });
});

describe("a unit worth more than one", () => {
  it("counts what the row says it was worth", () => {
    const rules = { ...COUNTED, unitsToWin: 2 };
    const standing = deriveSeries(rules, [{ ...scored(1, 101, 20), worth: 2 }]);

    expect(standing.sideATotal).toBe(4);
    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_A");
  });
});

describe("the threshold a level plays to", () => {
  it("counts won units through the halves a unit is worth", () => {
    expect(targetHalves(COUNTED)).toBe(4);
    expect(targetHalves(CHESS)).toBeNull();
  });
});
