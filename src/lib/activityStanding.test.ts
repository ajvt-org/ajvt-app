import { describe, it, expect } from "vitest";
import { activityStanding } from "./activityStanding";

const NOW = new Date("2026-08-23T12:00:00.000Z");
const day = (offset: number) => new Date(NOW.getTime() + offset * 86_400_000);

describe("activityStanding", () => {
  it("says nothing without a start date", () => {
    expect(activityStanding({ startsAt: null }, NOW)).toBeNull();
  });

  it("counts the days down to the start", () => {
    expect(activityStanding({ startsAt: day(3), endsAt: day(5) }, NOW)).toEqual({
      state: "upcoming",
      daysUntil: 3,
    });
    expect(activityStanding({ startsAt: day(1) }, NOW)).toEqual({
      state: "upcoming",
      daysUntil: 1,
    });
  });

  it("marks the start day itself", () => {
    expect(activityStanding({ startsAt: day(0), endsAt: day(4) }, NOW)).toEqual({
      state: "today",
    });
  });

  it("runs between start and end and finishes after", () => {
    expect(activityStanding({ startsAt: day(-2), endsAt: day(2) }, NOW)).toEqual({
      state: "running",
    });
    expect(activityStanding({ startsAt: day(-5), endsAt: day(-1) }, NOW)).toEqual({
      state: "finished",
    });
  });

  it("treats a start with no end as a one-day activity", () => {
    expect(activityStanding({ startsAt: day(-1) }, NOW)).toEqual({ state: "finished" });
    expect(activityStanding({ startsAt: day(0) }, NOW)).toEqual({ state: "today" });
  });

  it("keeps a tournament out of finished while a match is still to play", () => {
    expect(
      activityStanding({ startsAt: day(-6), endsAt: day(-1), unplayedMatches: 2 }, NOW),
    ).toEqual({ state: "awaiting", unplayed: 2 });
  });

  it("finishes it once nothing is left to play", () => {
    expect(
      activityStanding({ startsAt: day(-6), endsAt: day(-1), unplayedMatches: 0 }, NOW),
    ).toEqual({ state: "finished" });
  });

  it("leaves an activity with no matches to its dates", () => {
    expect(activityStanding({ startsAt: day(-6), endsAt: day(-1) }, NOW)).toEqual({
      state: "finished",
    });
  });

  it("says nothing new while the dates still cover today", () => {
    expect(
      activityStanding({ startsAt: day(-2), endsAt: day(2), unplayedMatches: 5 }, NOW),
    ).toEqual({ state: "running" });
    expect(activityStanding({ startsAt: day(0), endsAt: day(2), unplayedMatches: 5 }, NOW)).toEqual(
      {
        state: "today",
      },
    );
  });

  it("waits for the start whatever is left to play", () => {
    expect(activityStanding({ startsAt: day(3), endsAt: day(5), unplayedMatches: 4 }, NOW)).toEqual(
      {
        state: "upcoming",
        daysUntil: 3,
      },
    );
  });
});
