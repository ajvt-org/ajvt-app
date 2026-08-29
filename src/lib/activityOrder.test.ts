import { describe, it, expect } from "vitest";
import { sortActivities, activityRank } from "./activityOrder";

const NOW = new Date("2026-08-24T12:00:00.000Z");

function activity(id: string, startsAt: string | null, endsAt: string | null, isOpen = true) {
  return { id, startsAt, endsAt, isOpen };
}

function order(
  rows: {
    id: string;
    startsAt: string | null;
    endsAt: string | null;
    isOpen: boolean;
    order?: number;
  }[],
): string[] {
  return sortActivities(rows, NOW).map((r) => r.id);
}

describe("sortActivities", () => {
  it("keeps a running tournament on top of a finished one that is still open", () => {
    expect(
      order([
        activity("done", "2026-08-01", "2026-08-02"),
        activity("running", "2026-08-24", "2026-08-29", false),
      ]),
    ).toEqual(["running", "done"]);
  });

  it("does not let a closed registration push a live tournament down", () => {
    expect(
      order([
        activity("open-later", "2026-09-12", "2026-09-13", true),
        activity("live", "2026-08-20", "2026-08-29", false),
      ]),
    ).toEqual(["live", "open-later"]);
  });

  it("puts the nearest of the coming activities first", () => {
    expect(
      order([
        activity("september", "2026-09-12", "2026-09-13"),
        activity("tomorrow", "2026-08-25", "2026-08-25"),
      ]),
    ).toEqual(["tomorrow", "september"]);
  });

  it("counts a one-day activity happening today as live", () => {
    expect(activityRank(activity("x", "2026-08-24", null), NOW)[0]).toBe(0);
  });

  it("sinks the finished ones and shows the most recent of them first", () => {
    expect(
      order([
        activity("old", "2026-07-01", "2026-07-02"),
        activity("recent", "2026-08-20", "2026-08-21"),
      ]),
    ).toEqual(["recent", "old"]);
  });

  it("sits an undated activity above the finished ones while it takes sign-ups", () => {
    expect(
      order([
        activity("finished", "2026-08-01", "2026-08-02"),
        activity("undated-open", null, null, true),
        activity("undated-closed", null, null, false),
      ]),
    ).toEqual(["undated-open", "undated-closed", "finished"]);
  });

  it("leaves the order the admin chose alone between equals", () => {
    expect(
      order([
        activity("second", "2026-09-01", "2026-09-02"),
        activity("first", "2026-09-01", "2026-09-02"),
      ]),
    ).toEqual(["second", "first"]);
  });

  it("has nothing to sort in an empty list", () => {
    expect(sortActivities([], NOW)).toEqual([]);
  });
});

describe("the order the admin sets by hand", () => {
  const undated = (id: string, order: number) => ({
    id,
    startsAt: null,
    endsAt: null,
    isOpen: true,
    order,
  });

  it("decides between two activities of the same standing", () => {
    expect(order([undated("second", 1), undated("first", 0)])).toEqual(["first", "second"]);
  });

  it("never lifts an activity out of its own standing", () => {
    const finished = {
      id: "done",
      startsAt: "2026-08-01",
      endsAt: "2026-08-02",
      isOpen: true,
      order: 0,
    };
    const upcoming = {
      id: "soon",
      startsAt: "2026-09-01",
      endsAt: "2026-09-02",
      isOpen: true,
      order: 9,
    };

    expect(order([finished, upcoming])).toEqual(["soon", "done"]);
  });

  it("falls back on the order it was given when nothing says otherwise", () => {
    expect(order([undated("a", 0), undated("b", 0)])).toEqual(["a", "b"]);
  });

  it("treats an activity with no order as the first", () => {
    const noOrder = { id: "plain", startsAt: null, endsAt: null, isOpen: true };

    expect(order([undated("ranked", 3), noOrder])).toEqual(["plain", "ranked"]);
  });
});
