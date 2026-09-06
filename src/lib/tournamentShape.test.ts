import { describe, it, expect } from "vitest";
import {
  groupShapes,
  isValidGroupShape,
  knockoutIsPossible,
  qualifierCountsFor,
  qualifiersPerGroup,
} from "./tournamentShape";

describe("knockoutIsPossible", () => {
  it("takes any count of two or more", () => {
    for (const n of [2, 3, 6, 7, 12, 32, 33]) expect(knockoutIsPossible(n)).toBe(true);
  });

  it("refuses fewer than two", () => {
    expect(knockoutIsPossible(1)).toBe(false);
    expect(knockoutIsPossible(0)).toBe(false);
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
  });

  it("offers nothing for fewer than two teams", () => {
    expect(groupShapes(1)).toEqual([]);
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
