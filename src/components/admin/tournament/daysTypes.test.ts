import { describe, it, expect } from "vitest";
import { dayLabel } from "./daysTypes";

describe("heading a tournament day", () => {
  it("says which year, so two seasons do not head their days alike", () => {
    expect(dayLabel("2026-09-07T12:00:00.000Z")).toContain("2026");
    expect(dayLabel("2027-09-06T12:00:00.000Z")).toContain("2027");
  });

  it("keeps the long weekday and month it was written for", () => {
    const label = dayLabel("2026-09-07T12:00:00.000Z");

    expect(label).toContain("الاثنين");
    expect(label).toContain("سبتمبر");
  });

  it("says it in one sentence with the year last", () => {
    expect(dayLabel("2026-09-07T12:00:00.000Z")).toBe("الاثنين، 7 سبتمبر 2026");
  });

  it("carries no directional marks of its own", () => {
    expect(dayLabel("2026-09-07T12:00:00.000Z")).not.toMatch(/[​-‏]/);
  });

  it("reads the club's day, not the reader's", () => {
    expect(dayLabel("2026-09-07T23:30:00.000Z")).toContain("7 سبتمبر");
  });

  it("stays empty when a day has no date yet", () => {
    expect(dayLabel(null)).toBe("");
  });
});
