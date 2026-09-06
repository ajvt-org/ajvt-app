import { describe, it, expect } from "vitest";
import { bracketSize, drawFirstRound } from "./bracketDraw";
import {
  knockoutRoundSizes,
  pairQualifierSlots,
  qualifierSlots,
  slotsCanPair,
  type SlotPair,
  type QualifierSlot,
} from "./knockoutSlots";

const name = (s: QualifierSlot) => `${s.position}${String.fromCharCode(65 + s.groupIndex)}`;
const shown = (pairs: SlotPair[]) => pairs.map((p) => `${name(p.home)} v ${name(p.away)}`);

function meetingRound(pairs: SlotPair[], one: string, other: string): number | null {
  const at = (slot: string) =>
    pairs.findIndex((p) => name(p.home) === slot || name(p.away) === slot);
  let x = at(one);
  let y = at(other);
  if (x === -1 || y === -1) return null;
  let round = 1;
  while (x !== y) {
    x = Math.floor(x / 2);
    y = Math.floor(y / 2);
    round++;
  }
  return round;
}

describe("qualifierSlots", () => {
  it("names the top two of each of four groups", () => {
    expect(qualifierSlots(4, 8).map(name)).toEqual([
      "1A",
      "1B",
      "1C",
      "1D",
      "2A",
      "2B",
      "2C",
      "2D",
    ]);
  });

  it("names only the winners when one qualifies per group", () => {
    expect(qualifierSlots(4, 4).map(name)).toEqual(["1A", "1B", "1C", "1D"]);
  });

  it("names four from each of two groups", () => {
    expect(qualifierSlots(2, 8).map(name)).toEqual([
      "1A",
      "1B",
      "2A",
      "2B",
      "3A",
      "3B",
      "4A",
      "4B",
    ]);
  });
});

describe("pairQualifierSlots", () => {
  it("sends a group winner against a runner up from another group", () => {
    expect(shown(pairQualifierSlots(4, 8))).toEqual(["1A v 2B", "1C v 2D", "1B v 2A", "1D v 2C"]);
  });

  it("pairs the winners against each other when only one qualifies per group", () => {
    expect(shown(pairQualifierSlots(4, 4))).toEqual(["1A v 1B", "1C v 1D"]);
  });

  it("pairs the best against the worst across two groups", () => {
    expect(shown(pairQualifierSlots(2, 8))).toEqual(["1A v 4B", "2A v 3B", "2B v 3A", "1B v 4A"]);
  });

  it("uses every qualifier slot exactly once", () => {
    for (const [groups, qualifiers] of [
      [4, 8],
      [2, 8],
      [8, 8],
      [4, 4],
      [4, 16],
      [8, 16],
    ]) {
      const pairs = pairQualifierSlots(groups, qualifiers);
      const used = pairs.flatMap((p) => [name(p.home), name(p.away)]).sort();

      expect(pairs).toHaveLength(qualifiers / 2);
      expect(used).toEqual(qualifierSlots(groups, qualifiers).map(name).sort());
    }
  });

  it("never opens with two teams from the same group", () => {
    for (const [groups, qualifiers] of [
      [4, 8],
      [2, 8],
      [8, 8],
      [4, 16],
      [8, 16],
    ]) {
      const pairs = pairQualifierSlots(groups, qualifiers);

      expect(pairs.some((p) => p.home.groupIndex === p.away.groupIndex)).toBe(false);
    }
  });

  it("holds two teams from one group apart until the final", () => {
    expect(meetingRound(pairQualifierSlots(4, 8), "1A", "2A")).toBe(3);
    expect(meetingRound(pairQualifierSlots(8, 16), "1A", "2A")).toBe(4);
  });

  it("holds four teams from one group to one quarter each", () => {
    const pairs = pairQualifierSlots(4, 16);
    const rounds = ["2A", "3A", "4A"].map((other) => meetingRound(pairs, "1A", other));

    expect(rounds.every((r) => r !== null && r >= 3)).toBe(true);
  });

  it("refuses a qualifier count that is not a power of two", () => {
    expect(pairQualifierSlots(3, 6)).toEqual([]);
  });

  it("refuses groups that do not divide the qualifiers", () => {
    expect(pairQualifierSlots(3, 8)).toEqual([]);
  });

  it("refuses a single group", () => {
    expect(pairQualifierSlots(1, 8)).toEqual([]);
  });
});

describe("slotsCanPair", () => {
  it("accepts an even group count that divides a power of two", () => {
    expect(slotsCanPair(4, 8)).toBe(true);
    expect(slotsCanPair(2, 4)).toBe(true);
  });

  it("refuses an odd group count", () => {
    expect(slotsCanPair(3, 12)).toBe(false);
  });
});

describe("knockoutRoundSizes", () => {
  it("halves the field down to the final", () => {
    expect(knockoutRoundSizes(16)).toEqual([8, 4, 2, 1]);
    expect(knockoutRoundSizes(4)).toEqual([2, 1]);
    expect(knockoutRoundSizes(2)).toEqual([1]);
  });

  it("rounds a field that does not halve cleanly up to the bracket above it", () => {
    expect(knockoutRoundSizes(6)).toEqual([4, 2, 1]);
    expect(knockoutRoundSizes(3)).toEqual([2, 1]);
    expect(knockoutRoundSizes(12)).toEqual([8, 4, 2, 1]);
  });

  it("has no rounds for a field of fewer than two", () => {
    expect(knockoutRoundSizes(1)).toEqual([]);
    expect(knockoutRoundSizes(0)).toEqual([]);
  });

  it("halves from the first round down to a single final", () => {
    for (let count = 2; count <= 33; count++) {
      const sizes = knockoutRoundSizes(count);

      expect(sizes.at(0)).toBe(bracketSize(count) / 2);
      expect(sizes.at(-1)).toBe(1);
      expect(sizes.slice(1)).toEqual(sizes.slice(0, -1).map((size) => size / 2));
    }
  });

  it("opens with as many matches as the draw produces slots", () => {
    for (let count = 2; count <= 33; count++) {
      const entrants = Array.from({ length: count }, (_, i) => ({ id: String(i) }));

      expect(knockoutRoundSizes(count).at(0)).toBe(drawFirstRound(entrants)?.length);
    }
  });
});
