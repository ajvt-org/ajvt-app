import { describe, it, expect } from "vitest";
import {
  deriveSeries,
  nextUnitOrder,
  targetOf,
  type PlayedUnit,
  type RecordedMove,
  type SeriesRules,
} from "./matchSeries";

const BASE: SeriesRules = {
  countedBy: "OUTCOME",
  endsBy: "COUNT",
  unitCount: 2,
  target: null,
  unsettled: "DRAW",
  margin: null,
  continueUnits: null,
  deciderTarget: null,
  startingCredit: 0,
  creditWindow: 0,
};

const CHESS: SeriesRules = BASE;

const COUNTED: SeriesRules = {
  ...BASE,
  endsBy: "TARGET",
  unitCount: null,
  target: 2,
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

function teysse(order: number, side: "SIDE_A" | "SIDE_B"): RecordedMove {
  return { order, side, selfHalves: 4, otherHalves: 4 };
}

describe("a level that ends by a count of units", () => {
  it("stands at nothing before a unit is recorded", () => {
    const standing = deriveSeries(CHESS, []);

    expect(standing.sideATotal).toBe(0);
    expect(standing.sideBTotal).toBe(0);
    expect(standing.over).toBe(false);
    expect(standing.unitsLeft).toBe(2);
  });

  it("gives a whole unit to the side that won it", () => {
    const standing = deriveSeries(CHESS, [won(1, "SIDE_A")]);

    expect(standing.sideATotal).toBe(2);
    expect(standing.sideBTotal).toBe(0);
    expect(standing.over).toBe(false);
  });

  it("splits a drawn unit in half", () => {
    const standing = deriveSeries(CHESS, [drawn(1)]);

    expect(standing.sideATotal).toBe(1);
    expect(standing.sideBTotal).toBe(1);
  });

  it("is over when the count has been played", () => {
    const standing = deriveSeries(CHESS, [won(1, "SIDE_A"), drawn(2)]);

    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_A");
    expect(standing.sideATotal).toBe(3);
    expect(standing.sideBTotal).toBe(1);
  });

  it("ends level when the two sides finish equal and nothing follows", () => {
    const standing = deriveSeries(CHESS, [drawn(1), drawn(2)]);

    expect(standing.over).toBe(true);
    expect(standing.level).toBe(true);
    expect(standing.winner).toBeNull();
  });
});

describe("a level that ends at a number of units", () => {
  it("carries the number it has to reach", () => {
    expect(targetOf(COUNTED)).toBe(4);
    expect(targetOf(CHESS)).toBeNull();
  });

  it("counts a won unit towards it", () => {
    const standing = deriveSeries(COUNTED, [won(1, "SIDE_A")]);

    expect(standing.sideATotal).toBe(2);
    expect(standing.over).toBe(false);
  });

  it("stops as soon as a side reaches the number", () => {
    const standing = deriveSeries(COUNTED, [won(1, "SIDE_A"), won(2, "SIDE_A")]);

    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_A");
    expect(standing.unitsLeft).toBe(0);
  });

  it("takes no ceiling on how many units fit under it", () => {
    const standing = deriveSeries(COUNTED, [drawn(1), drawn(2), drawn(3)]);

    expect(standing.over).toBe(false);
    expect(standing.unitsRecorded).toBe(3);
    expect(standing.unitsAllowed).toBe(4);
  });

  it("does not count a unit played after the level was already over", () => {
    const standing = deriveSeries(COUNTED, [won(1, "SIDE_A"), won(2, "SIDE_A"), won(3, "SIDE_B")]);

    expect(standing.sideBTotal).toBe(0);
    expect(standing.unitsRecorded).toBe(2);
  });
});

describe("an abandoned unit", () => {
  it("scores nothing for either side", () => {
    const standing = deriveSeries(CHESS, [abandoned(1)]);

    expect(standing.sideATotal).toBe(0);
    expect(standing.sideBTotal).toBe(0);
  });

  it("still counts as one of the units the level holds", () => {
    const standing = deriveSeries(CHESS, [won(1, "SIDE_A"), abandoned(2)]);

    expect(standing.unitsRecorded).toBe(2);
    expect(standing.unitsScored).toBe(1);
    expect(standing.over).toBe(true);
  });
});

describe("a move", () => {
  it("swings both sides at once", () => {
    const standing = deriveSeries(CHESS, [], [teysse(1, "SIDE_A")]);

    expect(standing.sideATotal).toBe(4);
    expect(standing.sideBTotal).toBe(-4);
  });

  it("drives a side below nothing rather than flooring at zero", () => {
    const standing = deriveSeries(
      { ...COUNTED, target: 4 },
      [won(1, "SIDE_A")],
      [teysse(2, "SIDE_B")],
    );

    expect(standing.sideATotal).toBe(-2);
    expect(standing.sideBTotal).toBe(4);
  });

  it("wins the level on its own when the swing reaches the number", () => {
    const standing = deriveSeries(COUNTED, [abandoned(1)], [teysse(1, "SIDE_A")]);

    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_A");
  });

  it("lands before the unit it happened in, which scores nothing anyway", () => {
    const standing = deriveSeries(
      { ...COUNTED, target: 3 },
      [won(1, "SIDE_A"), abandoned(2)],
      [teysse(2, "SIDE_B")],
    );

    expect(standing.sideATotal).toBe(-2);
    expect(standing.sideBTotal).toBe(4);
    expect(standing.over).toBe(false);
  });

  it("takes one from each side and leaves them where they started", () => {
    const standing = deriveSeries(
      { ...COUNTED, target: 3 },
      [abandoned(1), abandoned(2)],
      [teysse(1, "SIDE_A"), teysse(2, "SIDE_B")],
    );

    expect(standing.sideATotal).toBe(0);
    expect(standing.sideBTotal).toBe(0);
  });

  it("takes two by one side to a win", () => {
    const standing = deriveSeries(
      { ...COUNTED, target: 4 },
      [abandoned(1), abandoned(2)],
      [teysse(1, "SIDE_A"), teysse(2, "SIDE_A")],
    );

    expect(standing.sideATotal).toBe(8);
    expect(standing.sideBTotal).toBe(-8);
    expect(standing.winner).toBe("SIDE_A");
  });

  it("is walked in order with the units rather than added on at the end", () => {
    const early = deriveSeries(
      COUNTED,
      [abandoned(1), won(2, "SIDE_A"), won(3, "SIDE_A")],
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

describe("a level whose units are continued while it stays unsettled", () => {
  const KNOCKOUT: SeriesRules = {
    ...CHESS,
    unsettled: "CONTINUE",
    margin: 1,
    continueUnits: 2,
  };

  it("stands as a result where nothing is continued", () => {
    const standing = deriveSeries(CHESS, [drawn(1), drawn(2)]);

    expect(standing.over).toBe(true);
    expect(standing.level).toBe(true);
    expect(standing.extending).toBe(false);
  });

  it("is continued by another pair rather than left level", () => {
    const standing = deriveSeries(KNOCKOUT, [drawn(1), drawn(2)]);

    expect(standing.over).toBe(false);
    expect(standing.extending).toBe(true);
    expect(standing.unitsAllowed).toBe(4);
    expect(standing.unitsLeft).toBe(2);
  });

  it("is continued again while it stays level", () => {
    const standing = deriveSeries(KNOCKOUT, [drawn(1), drawn(2), drawn(3), drawn(4)]);

    expect(standing.unitsAllowed).toBe(6);
    expect(standing.over).toBe(false);
  });

  it("stops as soon as the continuation breaks the tie", () => {
    const standing = deriveSeries(KNOCKOUT, [drawn(1), drawn(2), won(3, "SIDE_A"), drawn(4)]);

    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_A");
    expect(standing.extending).toBe(true);
  });

  it("is not continued when one side is already ahead", () => {
    const standing = deriveSeries(KNOCKOUT, [won(1, "SIDE_A"), drawn(2)]);

    expect(standing.over).toBe(true);
    expect(standing.extending).toBe(false);
  });

  it("takes the count of units to continue with off the level", () => {
    const standing = deriveSeries({ ...KNOCKOUT, continueUnits: 3 }, [drawn(1), drawn(2)]);

    expect(standing.unitsAllowed).toBe(5);
    expect(standing.unitsLeft).toBe(3);
  });
});

describe("a level whose units are counted by their points", () => {
  const SCORED: SeriesRules = {
    ...BASE,
    countedBy: "POINTS",
    endsBy: "TARGET",
    unitCount: null,
    target: 100,
    unsettled: "DRAW",
  };

  it("adds up what the units under it scored", () => {
    const standing = deriveSeries(SCORED, [scored(1, 30, 12), scored(2, 25, 40)]);

    expect(standing.sideATotal).toBe(55);
    expect(standing.sideBTotal).toBe(52);
    expect(standing.scored).toBe(true);
    expect(standing.over).toBe(false);
  });

  it("ends when a side passes the number", () => {
    const standing = deriveSeries(SCORED, [scored(1, 60, 12), scored(2, 45, 40)]);

    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_A");
  });

  it("gives it to the higher total when both sides pass together", () => {
    const standing = deriveSeries(SCORED, [scored(1, 101, 104)]);

    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_B");
  });

  it("plays another unit when both are past and neither leads by the margin", () => {
    const rules: SeriesRules = { ...SCORED, unsettled: "CONTINUE", margin: 1, continueUnits: 1 };
    const standing = deriveSeries(rules, [scored(1, 101, 101)]);

    expect(standing.over).toBe(false);
    expect(standing.winner).toBeNull();
  });

  it("stops level when nothing follows the tie", () => {
    const standing = deriveSeries(SCORED, [scored(1, 101, 101)]);

    expect(standing.over).toBe(true);
    expect(standing.level).toBe(true);
    expect(standing.winner).toBeNull();
  });

  it("waits for the margin the level asks for", () => {
    const rules: SeriesRules = { ...SCORED, unsettled: "CONTINUE", margin: 2, continueUnits: 1 };
    const standing = deriveSeries(rules, [scored(1, 101, 100)]);

    expect(standing.over).toBe(false);
    expect(standing.winner).toBeNull();
  });
});

describe("a level that plays a deciding unit", () => {
  const DECIDED: SeriesRules = { ...CHESS, unsettled: "DECIDER" };

  it("reads as unsettled once the count is played and nothing is settled", () => {
    const standing = deriveSeries(DECIDED, [drawn(1), drawn(2)]);

    expect(standing.unsettled).toBe(true);
    expect(standing.over).toBe(false);
    expect(standing.unitsLeft).toBe(1);
  });

  it("reads as settled where one side came out of the count ahead", () => {
    const standing = deriveSeries(DECIDED, [won(1, "SIDE_A"), drawn(2)]);

    expect(standing.unsettled).toBe(false);
    expect(standing.over).toBe(true);
  });

  it("is over once the deciding unit has been played", () => {
    const standing = deriveSeries(DECIDED, [drawn(1), drawn(2), won(3, "SIDE_A")]);

    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_A");
    expect(standing.unsettled).toBe(false);
  });

  it("takes only one deciding unit even where it too ends level", () => {
    const standing = deriveSeries(DECIDED, [drawn(1), drawn(2), drawn(3)]);

    expect(standing.over).toBe(true);
    expect(standing.unsettled).toBe(false);
    expect(standing.winner).toBeNull();
  });

  it("reads as unsettled on a level ending at a number when both are past it", () => {
    const rules: SeriesRules = {
      ...BASE,
      countedBy: "POINTS",
      endsBy: "TARGET",
      unitCount: null,
      target: 100,
      unsettled: "DECIDER",
    };
    const standing = deriveSeries(rules, [scored(1, 101, 101)]);

    expect(standing.unsettled).toBe(true);
    expect(standing.over).toBe(false);
  });
});

describe("a unit worth more than one", () => {
  it("counts what the row says it was worth", () => {
    const standing = deriveSeries(COUNTED, [{ ...won(1, "SIDE_A"), worth: 2 }]);

    expect(standing.sideATotal).toBe(4);
    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_A");
  });
});

describe("a level that starts with a credit", () => {
  const POINT: SeriesRules = {
    ...BASE,
    countedBy: "POINTS",
    endsBy: "TARGET",
    unitCount: null,
    target: 100,
    unsettled: "CONTINUE",
    margin: 1,
    continueUnits: 1,
    startingCredit: 26,
    creditWindow: 2,
  };

  it("credits both sides before anything is scored", () => {
    const standing = deriveSeries(POINT, []);

    expect(standing.sideATotal).toBe(26);
    expect(standing.sideBTotal).toBe(26);
  });

  it("keeps the credit for a side that scored in the opening units", () => {
    const standing = deriveSeries(POINT, [scored(1, 10, 0), scored(2, 0, 8)]);

    expect(standing.sideATotal).toBe(36);
    expect(standing.sideBTotal).toBe(34);
    expect(standing.sideALostCredit).toBe(false);
    expect(standing.sideBLostCredit).toBe(false);
  });

  it("keeps it on a side that scored in the second of them and not the first", () => {
    const standing = deriveSeries(POINT, [scored(1, 12, 0), scored(2, 0, 9)]);

    expect(standing.sideBTotal).toBe(35);
    expect(standing.sideBLostCredit).toBe(false);
  });

  it("takes it back from a side that scored nothing in all of them", () => {
    const standing = deriveSeries(POINT, [scored(1, 12, 0), scored(2, 15, 0)]);

    expect(standing.sideBTotal).toBe(0);
    expect(standing.sideBLostCredit).toBe(true);
    expect(standing.sideALostCredit).toBe(false);
  });

  it("leaves the credit standing while the window is still open", () => {
    const standing = deriveSeries(POINT, [scored(1, 12, 0)]);

    expect(standing.sideBTotal).toBe(26);
    expect(standing.sideBLostCredit).toBe(false);
  });

  it("takes nothing back where the level declares no credit", () => {
    const standing = deriveSeries({ ...POINT, startingCredit: 0, creditWindow: 0 }, [
      scored(1, 12, 0),
      scored(2, 15, 0),
    ]);

    expect(standing.sideBTotal).toBe(0);
    expect(standing.sideBLostCredit).toBe(false);
  });

  it("counts the credit in the units the level counts by", () => {
    const rules: SeriesRules = { ...COUNTED, startingCredit: 1, creditWindow: 1 };
    const standing = deriveSeries(rules, []);

    expect(standing.sideATotal).toBe(2);
  });
});
