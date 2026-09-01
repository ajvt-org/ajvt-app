import { describe, it, expect } from "vitest";
import {
  groupShapes,
  groupsRefusal,
  isValidGroupShape,
  knockoutRefusal,
  nearestBracketSizes,
  qualifierCountsFor,
  qualifiersPerGroup,
} from "./tournamentShape";

describe("knockoutRefusal", () => {
  it("accepts a count that halves cleanly to a final", () => {
    for (const n of [2, 4, 8, 16, 32]) expect(knockoutRefusal(n)).toBeNull();
  });

  it("refuses six teams and names the counts either side", () => {
    expect(knockoutRefusal(6)).toEqual({ kind: "notABracket", teamCount: 6, below: 4, above: 8 });
  });

  it("refuses a count with nothing below it", () => {
    expect(knockoutRefusal(3)).toEqual({ kind: "notABracket", teamCount: 3, below: 2, above: 4 });
  });

  it("refuses fewer than two teams", () => {
    expect(knockoutRefusal(1)).toEqual({ kind: "tooFewTeams", teamCount: 1 });
    expect(knockoutRefusal(0)).toEqual({ kind: "tooFewTeams", teamCount: 0 });
  });
});

describe("nearestBracketSizes", () => {
  it("has no count below when two is already too many", () => {
    expect(nearestBracketSizes(2)).toEqual({ below: null, above: 2 });
  });
});

describe("groupShapes", () => {
  it("offers twelve teams in two or four groups", () => {
    expect(groupShapes(12)).toEqual([
      { groupCount: 2, groupSize: 6, qualifierCounts: [2, 4, 8] },
      { groupCount: 4, groupSize: 3, qualifierCounts: [4, 8] },
    ]);
  });

  it("does not offer three or six groups of twelve", () => {
    const counts = groupShapes(12).map((s) => s.groupCount);

    expect(counts).not.toContain(3);
    expect(counts).not.toContain(6);
  });

  it("offers sixteen teams in four groups", () => {
    const four = groupShapes(16).find((s) => s.groupCount === 4);

    expect(four).toEqual({ groupCount: 4, groupSize: 4, qualifierCounts: [4, 8] });
  });

  it("never leaves a group of one", () => {
    for (const shape of groupShapes(16)) expect(shape.groupSize).toBeGreaterThanOrEqual(2);
  });

  it("offers nothing for a prime count that cannot be split", () => {
    expect(groupShapes(7)).toEqual([]);
    expect(groupsRefusal(7)).toEqual({ kind: "noGroupSplit", teamCount: 7 });
  });

  it("refuses fewer than two teams before looking at the split", () => {
    expect(groupsRefusal(1)).toEqual({ kind: "tooFewTeams", teamCount: 1 });
  });
});

describe("qualifierCountsFor", () => {
  it("keeps only the powers of two the groups divide", () => {
    expect(qualifierCountsFor(16, 4)).toEqual([4, 8]);
    expect(qualifierCountsFor(12, 3)).toEqual([]);
  });

  it("refuses as many qualifiers as there are teams", () => {
    expect(qualifierCountsFor(16, 4)).not.toContain(16);
    expect(qualifierCountsFor(8, 2)).toEqual([2, 4]);
  });
});

describe("isValidGroupShape", () => {
  it("accepts a combination the wizard offers", () => {
    expect(isValidGroupShape(12, 4, 8)).toBe(true);
  });

  it("refuses groups that divide the teams but not the qualifiers", () => {
    expect(isValidGroupShape(12, 3, 4)).toBe(false);
  });

  it("refuses a qualifier count that is not a power of two", () => {
    expect(isValidGroupShape(12, 2, 6)).toBe(false);
  });

  it("refuses every team qualifying", () => {
    expect(isValidGroupShape(8, 2, 8)).toBe(false);
  });
});

describe("qualifiersPerGroup", () => {
  it("splits the qualifiers evenly across the groups", () => {
    expect(qualifiersPerGroup(4, 8)).toBe(2);
    expect(qualifiersPerGroup(4, 4)).toBe(1);
    expect(qualifiersPerGroup(2, 8)).toBe(4);
  });
});
