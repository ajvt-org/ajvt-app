import { describe, it, expect } from "vitest";
import { layoutRounds, matchDaysNeeded } from "./scheduleLayout";

describe("laying rounds onto days", () => {
  it("gives each round its own day, matches at the slot times", () => {
    const layout = layoutRounds([2, 2], ["16:00", "17:00"]);

    expect(layout[0]).toEqual([
      { day: 0, time: "16:00" },
      { day: 0, time: "17:00" },
    ]);
    expect(layout[1]).toEqual([
      { day: 1, time: "16:00" },
      { day: 1, time: "17:00" },
    ]);
  });

  it("spills a round bigger than the slots onto the next day", () => {
    const layout = layoutRounds([3], ["16:00", "17:00"]);

    expect(layout[0]).toEqual([
      { day: 0, time: "16:00" },
      { day: 0, time: "17:00" },
      { day: 1, time: "16:00" },
    ]);
    expect(matchDaysNeeded([3], ["16:00", "17:00"])).toBe(2);
  });

  it("starts the next round on a fresh day after a spill", () => {
    const layout = layoutRounds([3, 1], ["16:00", "17:00"]);

    expect(layout[1]).toEqual([{ day: 2, time: "16:00" }]);
    expect(matchDaysNeeded([3, 1], ["16:00", "17:00"])).toBe(3);
  });

  it("skips empty chunks without burning a day", () => {
    const layout = layoutRounds([0, 1], ["16:00"]);

    expect(layout[1]).toEqual([{ day: 0, time: "16:00" }]);
  });

  it("falls back to one slot when none are given", () => {
    expect(layoutRounds([2], [])[0]).toEqual([
      { day: 0, time: "16:00" },
      { day: 1, time: "16:00" },
    ]);
  });
});
