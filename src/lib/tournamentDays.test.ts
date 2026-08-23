import { describe, it, expect } from "vitest";
import { atTime, dayDate, derivePlan, endsAtFor, timeOf } from "./tournamentDays";

const AUG_24 = new Date("2026-08-24T00:00:00.000Z");

describe("day arithmetic", () => {
  it("counts the first day as the start date itself", () => {
    expect(dayDate(AUG_24, 1).toISOString()).toBe("2026-08-24T00:00:00.000Z");
    expect(dayDate(AUG_24, 6).toISOString()).toBe("2026-08-29T00:00:00.000Z");
  });

  it("ends on the last day's date", () => {
    expect(endsAtFor(AUG_24, 6)?.toISOString()).toBe("2026-08-29T00:00:00.000Z");
    expect(endsAtFor(AUG_24, 0)).toBeNull();
  });

  it("puts a slot time onto a day and reads it back", () => {
    const at = atTime(dayDate(AUG_24, 2), "16:30");
    expect(at.toISOString()).toBe("2026-08-25T16:30:00.000Z");
    expect(timeOf(at)).toBe("16:30");
  });
});

describe("deriving the plan from dated matches", () => {
  it("answers nothing for a tournament with no dated matches", () => {
    expect(derivePlan(AUG_24, [])).toBeNull();
  });

  it("reads consecutive match days straight through", () => {
    const plan = derivePlan(AUG_24, [
      new Date("2026-08-24T16:00:00.000Z"),
      new Date("2026-08-24T17:00:00.000Z"),
      new Date("2026-08-25T16:00:00.000Z"),
    ]);

    expect(plan?.days).toEqual([
      { position: 1, isRest: false },
      { position: 2, isRest: false },
    ]);
    expect(plan?.positionByMatch).toEqual([1, 1, 2]);
  });

  it("turns an uncovered day in the middle into a rest day", () => {
    const plan = derivePlan(AUG_24, [
      new Date("2026-08-24T16:00:00.000Z"),
      new Date("2026-08-26T16:00:00.000Z"),
    ]);

    expect(plan?.days.map((d) => d.isRest)).toEqual([false, true, false]);
  });

  it("starts from the start date even when the first match comes later", () => {
    const plan = derivePlan(AUG_24, [new Date("2026-08-26T16:00:00.000Z")]);

    expect(plan?.days).toHaveLength(3);
    expect(plan?.days[0].isRest).toBe(true);
    expect(plan?.positionByMatch).toEqual([3]);
  });

  it("adopts the first match's day when no start date exists", () => {
    const plan = derivePlan(null, [new Date("2026-08-26T16:00:00.000Z")]);

    expect(plan?.startsAt.toISOString()).toBe("2026-08-26T00:00:00.000Z");
    expect(plan?.days).toEqual([{ position: 1, isRest: false }]);
  });
});
