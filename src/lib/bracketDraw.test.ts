import { describe, it, expect } from "vitest";
import { bracketSize, byeCount, drawFirstRound } from "./bracketDraw";

const e = (id: string, groupId: string | null = null) => ({ id, groupId });

describe("bracketSize", () => {
  it("rounds an entrant count up to the bracket that holds it", () => {
    expect([2, 3, 5, 8, 9].map(bracketSize)).toEqual([2, 4, 8, 8, 16]);
  });
});

describe("byeCount", () => {
  it("is nothing on a power of two", () => {
    expect(byeCount(8)).toBe(0);
  });

  it("fills the gap up to the next power of two", () => {
    expect([3, 5, 6, 7].map(byeCount)).toEqual([1, 3, 2, 1]);
  });
});

describe("drawFirstRound", () => {
  it("refuses a field of one", () => {
    expect(drawFirstRound([e("a")])).toBeNull();
  });

  it("pairs a power of two with no byes", () => {
    const slots = drawFirstRound([e("a"), e("b"), e("c"), e("d")]);

    expect(slots).toHaveLength(2);
    expect(slots!.every((slot) => slot.away !== null)).toBe(true);
  });

  it("fills an odd field with byes so the round is a power of two", () => {
    const slots = drawFirstRound([e("a"), e("b"), e("c"), e("d"), e("e")]);

    expect(slots).toHaveLength(4);
    expect(slots!.filter((slot) => slot.away === null)).toHaveLength(3);
  });

  it("gives every entrant exactly one slot", () => {
    const entrants = ["a", "b", "c", "d", "e", "f"].map((id) => e(id));
    const slots = drawFirstRound(entrants)!;
    const seated = slots.flatMap((slot) => [slot.home.id, slot.away?.id]).filter(Boolean);

    expect(new Set(seated)).toEqual(new Set(entrants.map((x) => x.id)));
    expect(seated).toHaveLength(6);
  });

  it("keeps two entrants of one group apart while it hands out byes", () => {
    const slots = drawFirstRound([
      e("a1", "g1"),
      e("a2", "g1"),
      e("a3", "g1"),
      e("b1", "g2"),
      e("b2", "g2"),
      e("b3", "g2"),
    ])!;

    for (const slot of slots) {
      if (slot.away) expect(slot.home.groupId).not.toBe(slot.away.groupId);
    }
  });

  it("backtracks out of a greedy dead end", () => {
    const slots = drawFirstRound([
      e("a1", "g1"),
      e("b1", "g2"),
      e("a2", "g1"),
      e("b2", "g2"),
      e("c1", "g3"),
      e("c2", "g3"),
    ])!;

    expect(slots).toHaveLength(4);
    for (const slot of slots) {
      if (slot.away) expect(slot.home.groupId).not.toBe(slot.away.groupId);
    }
  });

  it("gives up when one group holds more of the field than the byes can absorb", () => {
    expect(drawFirstRound([e("a1", "g1"), e("a2", "g1"), e("a3", "g1"), e("a4", "g1")])).toBeNull();
  });

  it("spreads the byes among the matches rather than stacking them", () => {
    const slots = drawFirstRound([e("a"), e("b"), e("c"), e("d"), e("e"), e("f")])!;

    expect(slots.map((slot) => slot.away === null)).toEqual([false, true, false, true]);
  });
});
