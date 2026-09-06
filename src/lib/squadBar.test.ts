import { describe, expect, it } from "vitest";
import { barScale, outsideBarGeometry, percentOf, squadBarGeometry } from "./squadBar";

const RANGE = { min: 16, max: 22 };

describe("the scale a bar is drawn on", () => {
  it("runs to the cap while the count is within it", () => {
    expect(barScale(22, 19)).toBe(22);
    expect(barScale(22, 22)).toBe(22);
  });

  it("stretches to the count once the cap is passed", () => {
    expect(barScale(22, 27)).toBe(27);
    expect(barScale(4, 6)).toBe(6);
  });

  it("never collapses to nothing where the cap is nothing", () => {
    expect(barScale(0, 0)).toBe(1);
  });

  it("turns a value into its share of the track", () => {
    expect(percentOf(11, 22)).toBe(50);
    expect(percentOf(0, 22)).toBe(0);
  });
});

describe("a tournament that sets no maximum", () => {
  it("has no squad bar to draw", () => {
    expect(squadBarGeometry(5, { min: 3, max: null })).toBeNull();
  });
});

describe("the squad fill", () => {
  it("stops at the maximum and hands the rest to the over segment", () => {
    const bar = squadBarGeometry(27, RANGE)!;

    expect(bar.fill).toBeCloseTo((22 / 27) * 100);
    expect(bar.over!.start).toBeCloseTo((22 / 27) * 100);
    expect(bar.over!.width).toBeCloseTo((5 / 27) * 100);
  });

  it("leaves no over segment while the squad is within the range", () => {
    expect(squadBarGeometry(22, RANGE)!.over).toBeNull();
  });

  it("is marked short below the minimum and not at it", () => {
    expect(squadBarGeometry(15, RANGE)!.short).toBe(true);
    expect(squadBarGeometry(16, RANGE)!.short).toBe(false);
  });

  it("is never short where the tournament sets no minimum", () => {
    expect(squadBarGeometry(1, { min: null, max: 8 })!.short).toBe(false);
  });
});

describe("the marks along the squad track", () => {
  it("puts the maximum at the end of the track while the squad is within it", () => {
    expect(squadBarGeometry(19, RANGE)!.marks).toEqual([
      { value: 16, at: (16 / 22) * 100 },
      { value: 22, at: 100 },
    ]);
  });

  it("pulls the maximum back off the end once the track has stretched", () => {
    expect(squadBarGeometry(27, RANGE)!.marks.at(-1)!.at).toBeCloseTo(81.48, 2);
  });

  it("drops a minimum that would sit on top of the maximum", () => {
    expect(squadBarGeometry(4, { min: 8, max: 8 })!.marks.map((mark) => mark.value)).toEqual([8]);
  });
});

describe("the count label", () => {
  it("lands where the fill ends", () => {
    expect(squadBarGeometry(11, RANGE)!.countAt).toBe(50);
  });

  it("sits at the end of the track when the squad is full, not short of it", () => {
    expect(squadBarGeometry(22, RANGE)!.countAt).toBe(100);
  });

  it("stays at the end of the track once the squad is over the maximum", () => {
    expect(squadBarGeometry(27, RANGE)!.countAt).toBe(100);
  });

  it("sits at the start of an empty squad rather than being pushed in", () => {
    expect(squadBarGeometry(0, RANGE)!.countAt).toBe(0);
  });
});

describe("the outside share, on a scale of its own", () => {
  it("gives a handful of players the whole track rather than a fifth of it", () => {
    const bar = outsideBarGeometry({ count: 2, limit: 4 });

    expect(bar.fill).toBe(50);
    expect(bar.countAt).toBe(50);
    expect(bar.marks).toEqual([{ value: 4, at: 100 }]);
  });

  it("fills the track at the limit without spilling past it", () => {
    const bar = outsideBarGeometry({ count: 4, limit: 4 });

    expect(bar.fill).toBe(100);
    expect(bar.over).toBeNull();
  });

  it("stretches its own scale rather than pinning at full when a team is over", () => {
    const bar = outsideBarGeometry({ count: 6, limit: 4 });

    expect(bar.fill).toBeCloseTo((4 / 6) * 100);
    expect(bar.over!.width).toBeCloseTo((2 / 6) * 100);
    expect(bar.marks).toEqual([{ value: 4, at: (4 / 6) * 100 }]);
    expect(bar.countAt).toBe(100);
  });

  it("draws an empty track where no player comes from outside", () => {
    const bar = outsideBarGeometry({ count: 0, limit: 4 });

    expect(bar.fill).toBe(0);
    expect(bar.over).toBeNull();
  });
});
