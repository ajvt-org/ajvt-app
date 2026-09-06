import { describe, it, expect } from "vitest";
import {
  deriveSeries,
  nextPartOrder,
  targetHalves,
  type PlayedPart,
  type RecordedAdjustment,
  type SeriesRules,
} from "./matchSeries";

const CHESS: SeriesRules = {
  partsPerMatch: 2,
  matchEnding: "PLAY_ALL",
  partsToWin: null,
  partDecision: "OUTCOME",
  extendsWhenLevel: false,
};

const MARYASS: SeriesRules = {
  partsPerMatch: 3,
  matchEnding: "FIRST_TO",
  partsToWin: 2,
  partDecision: "POINTS",
  extendsWhenLevel: false,
};

function won(order: number, side: "SIDE_A" | "SIDE_B"): PlayedPart {
  return { order, abandoned: false, outcome: side, sideAPoints: null, sideBPoints: null };
}

function drawn(order: number): PlayedPart {
  return { order, abandoned: false, outcome: "DRAW", sideAPoints: null, sideBPoints: null };
}

function scored(order: number, a: number, b: number): PlayedPart {
  return { order, abandoned: false, outcome: null, sideAPoints: a, sideBPoints: b };
}

function abandoned(order: number): PlayedPart {
  return { order, abandoned: true, outcome: null, sideAPoints: null, sideBPoints: null };
}

function teysse(order: number, side: "SIDE_A" | "SIDE_B"): RecordedAdjustment {
  return { order, side, selfHalves: 4, otherHalves: 4 };
}

describe("a match played out in full", () => {
  it("stands at nothing before a part is recorded", () => {
    const standing = deriveSeries(CHESS, []);

    expect(standing.sideAHalves).toBe(0);
    expect(standing.sideBHalves).toBe(0);
    expect(standing.over).toBe(false);
    expect(standing.partsLeft).toBe(2);
  });

  it("gives a whole part to the side that won it", () => {
    const standing = deriveSeries(CHESS, [won(1, "SIDE_A")]);

    expect(standing.sideAHalves).toBe(2);
    expect(standing.sideBHalves).toBe(0);
    expect(standing.over).toBe(false);
  });

  it("splits a drawn part in half", () => {
    const standing = deriveSeries(CHESS, [drawn(1)]);

    expect(standing.sideAHalves).toBe(1);
    expect(standing.sideBHalves).toBe(1);
  });

  it("is over when every part has been recorded", () => {
    const standing = deriveSeries(CHESS, [won(1, "SIDE_A"), drawn(2)]);

    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_A");
    expect(standing.sideAHalves).toBe(3);
    expect(standing.sideBHalves).toBe(1);
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
    expect(targetHalves(MARYASS)).toBe(4);
    expect(targetHalves(CHESS)).toBeNull();
  });

  it("gives a part to whoever scored more inside it", () => {
    const standing = deriveSeries(MARYASS, [scored(1, 101, 74)]);

    expect(standing.sideAHalves).toBe(2);
    expect(standing.over).toBe(false);
  });

  it("stops as soon as a side reaches the target", () => {
    const standing = deriveSeries(MARYASS, [scored(1, 101, 74), scored(2, 100, 60)]);

    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_A");
    expect(standing.partsLeft).toBe(1);
  });

  it("does not count a part played after the match was already over", () => {
    const standing = deriveSeries(MARYASS, [
      scored(1, 101, 74),
      scored(2, 100, 60),
      scored(3, 10, 100),
    ]);

    expect(standing.sideBHalves).toBe(0);
    expect(standing.partsRecorded).toBe(2);
  });
});

describe("an abandoned part", () => {
  it("scores nothing for either side", () => {
    const standing = deriveSeries(CHESS, [abandoned(1)]);

    expect(standing.sideAHalves).toBe(0);
    expect(standing.sideBHalves).toBe(0);
  });

  it("still counts as one of the parts the match holds", () => {
    const standing = deriveSeries(CHESS, [won(1, "SIDE_A"), abandoned(2)]);

    expect(standing.partsRecorded).toBe(2);
    expect(standing.partsScored).toBe(1);
    expect(standing.over).toBe(true);
  });
});

describe("an adjustment", () => {
  it("swings both sides at once", () => {
    const standing = deriveSeries(CHESS, [], [teysse(1, "SIDE_A")]);

    expect(standing.sideAHalves).toBe(4);
    expect(standing.sideBHalves).toBe(-4);
  });

  it("drives a side below nothing rather than flooring at zero", () => {
    const standing = deriveSeries(MARYASS, [scored(1, 101, 74)], [teysse(2, "SIDE_B")]);

    expect(standing.sideAHalves).toBe(-2);
    expect(standing.sideBHalves).toBe(4);
  });

  it("wins the match on its own when the swing reaches the target", () => {
    const standing = deriveSeries(MARYASS, [abandoned(1)], [teysse(1, "SIDE_A")]);

    expect(standing.over).toBe(true);
    expect(standing.winner).toBe("SIDE_A");
    expect(standing.partsLeft).toBe(3);
  });

  it("lands before the part it happened in, which scores nothing anyway", () => {
    const standing = deriveSeries(
      { ...MARYASS, partsToWin: 3 },
      [scored(1, 101, 20), abandoned(2)],
      [teysse(2, "SIDE_B")],
    );

    expect(standing.sideAHalves).toBe(-2);
    expect(standing.sideBHalves).toBe(4);
    expect(standing.over).toBe(false);
  });

  it("takes one from each side and leaves them where they started", () => {
    const standing = deriveSeries(
      { ...MARYASS, partsToWin: 3, partsPerMatch: 5 },
      [abandoned(1), abandoned(2)],
      [teysse(1, "SIDE_A"), teysse(2, "SIDE_B")],
    );

    expect(standing.sideAHalves).toBe(0);
    expect(standing.sideBHalves).toBe(0);
  });

  it("takes two by one side to a win", () => {
    const standing = deriveSeries(
      { ...MARYASS, partsToWin: 4, partsPerMatch: 5 },
      [abandoned(1), abandoned(2)],
      [teysse(1, "SIDE_A"), teysse(2, "SIDE_A")],
    );

    expect(standing.sideAHalves).toBe(8);
    expect(standing.sideBHalves).toBe(-8);
    expect(standing.winner).toBe("SIDE_A");
  });

  it("is walked in order with the parts rather than added on at the end", () => {
    const early = deriveSeries(
      { ...MARYASS, partsToWin: 2, partsPerMatch: 4 },
      [abandoned(1), scored(2, 100, 10), scored(3, 100, 10)],
      [teysse(1, "SIDE_B")],
    );

    expect(early.winner).toBe("SIDE_B");
    expect(early.partsRecorded).toBe(0);
  });
});

describe("nextPartOrder", () => {
  it("starts at one", () => {
    expect(nextPartOrder([])).toBe(1);
  });

  it("follows the highest order recorded", () => {
    expect(nextPartOrder([won(1, "SIDE_A"), abandoned(3)])).toBe(4);
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
    expect(standing.partsAllowed).toBe(4);
    expect(standing.partsLeft).toBe(2);
  });

  it("is extended again while it stays level", () => {
    const standing = deriveSeries(KNOCKOUT, [drawn(1), drawn(2), drawn(3), drawn(4)]);

    expect(standing.partsAllowed).toBe(6);
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
