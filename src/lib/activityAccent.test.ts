import { describe, it, expect } from "vitest";
import { activityAccent } from "./activityAccent";

const NOW = new Date("2026-08-24T12:00:00.000Z");

describe("activityAccent", () => {
  it("marks the edge of an activity being held right now", () => {
    expect(activityAccent({ startsAt: "2026-08-20", endsAt: "2026-08-29" }, NOW)).toBe(
      "activity-row-live",
    );
  });

  it("marks a one-day activity held today", () => {
    expect(activityAccent({ startsAt: "2026-08-24", endsAt: null }, NOW)).toBe("activity-row-live");
  });

  it("warms the edge of one that has not started", () => {
    expect(activityAccent({ startsAt: "2026-09-12", endsAt: "2026-09-13" }, NOW)).toBe(
      "activity-row-soon",
    );
  });

  it("dims one that is over", () => {
    expect(activityAccent({ startsAt: "2026-07-01", endsAt: "2026-07-02" }, NOW)).toBe(
      "activity-row-done",
    );
  });

  it("leaves an undated activity unmarked", () => {
    expect(activityAccent({ startsAt: null }, NOW)).toBe("");
  });
});
