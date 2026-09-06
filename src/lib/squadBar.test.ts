import { describe, expect, it } from "vitest";
import { insideTrack, percentOf, squadBarGeometry, squadScale } from "./squadBar";

const RANGE = { min: 16, max: 22 };

describe("the scale the bar is drawn on", () => {
  it("runs to the maximum while the squad is within it", () => {
    expect(squadScale(22, 19)).toBe(22);
    expect(squadScale(22, 22)).toBe(22);
  });

  it("stretches to the count once the squad is over the maximum", () => {
    expect(squadScale(22, 27)).toBe(27);
  });

  it("never collapses to nothing when a tournament allows no players", () => {
    expect(squadScale(0, 0)).toBe(1);
  });

  it("turns a value into its share of the track", () => {
    expect(percentOf(11, 22)).toBe(50);
    expect(percentOf(0, 22)).toBe(0);
  });
});

describe("a tournament that sets no maximum", () => {
  it("has no bar to draw", () => {
    expect(squadBarGeometry(5, { min: 3, max: null }, null)).toBeNull();
  });
});

describe("the squad fill", () => {
  it("stops at the maximum and hands the rest to the over segment", () => {
    const bar = squadBarGeometry(27, RANGE, null)!;

    expect(bar.fill).toBeCloseTo((22 / 27) * 100);
    expect(bar.over).not.toBeNull();
    expect(bar.over!.start).toBeCloseTo((22 / 27) * 100);
    expect(bar.over!.width).toBeCloseTo((5 / 27) * 100);
  });

  it("leaves no over segment while the squad is within the range", () => {
    expect(squadBarGeometry(22, RANGE, null)!.over).toBeNull();
  });

  it("is marked short below the minimum and not at it", () => {
    expect(squadBarGeometry(15, RANGE, null)!.short).toBe(true);
    expect(squadBarGeometry(16, RANGE, null)!.short).toBe(false);
  });

  it("is never short where the tournament sets no minimum", () => {
    expect(squadBarGeometry(1, { min: null, max: 8 }, null)!.short).toBe(false);
  });
});

describe("the marks along the track", () => {
  it("puts the maximum at the end of the track while the squad is within it", () => {
    const bar = squadBarGeometry(19, RANGE, null)!;

    expect(bar.ticks.map((tick) => tick.at)).toEqual([(16 / 22) * 100, 100]);
  });

  it("pulls the maximum back off the end once the track has stretched", () => {
    const bar = squadBarGeometry(27, RANGE, null)!;

    expect(bar.ticks.at(-1)!.at).toBeCloseTo(81.48, 2);
  });

  it("drops a minimum that would sit on top of the maximum", () => {
    const bar = squadBarGeometry(4, { min: 8, max: 8 }, null)!;

    expect(bar.ticks).toHaveLength(1);
    expect(bar.axis.map((mark) => mark.value)).toEqual([8]);
  });

  it("reads the axis from the outside limit through the minimum to the maximum", () => {
    const bar = squadBarGeometry(19, RANGE, { count: 2, limit: 4 })!;

    expect(bar.axis.map((mark) => mark.value)).toEqual([4, 16, 22]);
    expect(bar.axis.map((mark) => mark.dashed)).toEqual([true, false, false]);
  });
});

describe("the outside share", () => {
  it("hatches only as far as the squad it is part of", () => {
    expect(squadBarGeometry(3, RANGE, { count: 5, limit: 4 })!.hatch).toBeCloseTo((3 / 22) * 100);
  });

  it("draws nothing where no player comes from outside", () => {
    expect(squadBarGeometry(19, RANGE, { count: 0, limit: 4 })!.hatch).toBeNull();
    expect(squadBarGeometry(19, RANGE, { count: 0, limit: 4 })!.outsideOver).toBeNull();
  });

  it("marks the part of the share that is past the limit", () => {
    const bar = squadBarGeometry(19, RANGE, { count: 6, limit: 4 })!;

    expect(bar.outsideOver!.start).toBeCloseTo((4 / 22) * 100);
    expect(bar.outsideOver!.width).toBeCloseTo((2 / 22) * 100);
  });

  it("is absent from the bar where the tournament does not limit it", () => {
    const bar = squadBarGeometry(19, RANGE, null)!;

    expect(bar.hatch).toBeNull();
    expect(bar.axis.some((mark) => mark.dashed)).toBe(false);
  });
});

describe("the count label", () => {
  it("is held away from both ends of the track", () => {
    expect(insideTrack(0)).toBe(6);
    expect(insideTrack(100)).toBe(94);
    expect(insideTrack(50)).toBe(50);
  });

  it("lands where the fill ends", () => {
    expect(squadBarGeometry(11, RANGE, null)!.countAt).toBe(50);
  });

  it("stacks onto the maximum numeral when the squad is full", () => {
    const bar = squadBarGeometry(22, RANGE, null)!;

    expect(bar.countAt).toBe(94);
    expect(insideTrack(bar.axis.at(-1)!.at)).toBe(94);
  });
});
