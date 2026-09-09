import { describe, it, expect } from "vitest";
import {
  CLUB_TIMEZONE,
  clubOffsetMs,
  formatDate,
  formatDateTime,
  clubDayParts,
  formatDayKey,
  formatLongDate,
  formatMonthName,
  formatTime,
  matchDateKey,
  matchDateToLocalInput,
  parseMatchDate,
  todayClubDateKey,
} from "./clubTime";

const RAMADAN = new Date("2026-03-15T12:00:00Z");
const OUTSIDE_RAMADAN = new Date("2026-08-24T12:00:00Z");

describe("the club's clock", () => {
  it("is Nouakchott, where the association is", () => {
    expect(CLUB_TIMEZONE).toBe("Africa/Nouakchott");
  });

  it("holds one offset all year, Ramadan included", () => {
    expect(clubOffsetMs(RAMADAN)).toBe(0);
    expect(clubOffsetMs(OUTSIDE_RAMADAN)).toBe(0);
  });
});

describe("reading a kickoff typed into the admin form", () => {
  it("keeps the hour that was typed", () => {
    expect(formatTime(parseMatchDate("2026-08-24T20:00"))).toBe("20:00");
  });

  it("keeps it during Ramadan too", () => {
    expect(formatTime(parseMatchDate("2026-03-15T20:00"))).toBe("20:00");
  });

  it("accepts seconds", () => {
    expect(formatTime(parseMatchDate("2026-08-24T20:00:00"))).toBe("20:00");
  });

  it("leaves an already-zoned value alone", () => {
    expect(parseMatchDate("2026-08-24T19:00:00Z").toISOString()).toBe("2026-08-24T19:00:00.000Z");
  });

  it("round-trips back into the form unchanged", () => {
    for (const typed of ["2026-01-15T20:00", "2026-03-15T20:00", "2026-03-15T00:30"]) {
      expect(matchDateToLocalInput(parseMatchDate(typed))).toBe(typed);
    }
  });

  it("shows the public page the same hour the form reloads", () => {
    for (const typed of ["2026-01-15T20:00", "2026-03-15T20:00", "2026-08-24T23:30"]) {
      const stored = parseMatchDate(typed);
      expect(formatTime(stored)).toBe(matchDateToLocalInput(stored).slice(11, 16));
    }
  });
});

describe("naming the day a kickoff belongs to", () => {
  it("files a late kickoff under the day the club is still in", () => {
    expect(matchDateKey("2026-08-24T23:30:00Z")).toBe("2026-08-24");
  });

  it("spells a kickoff out in full", () => {
    expect(formatDateTime("2026-08-24T19:00:00Z")).toBe("2026/08/24 19:00");
  });

  it("reports today as a calendar day", () => {
    expect(todayClubDateKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("printing an instant for a reader", () => {
  it("puts the parts in a fixed order", () => {
    expect(formatDateTime("2026-08-14T15:18:00Z")).toBe("2026/08/14 15:18");
  });

  it("pads single digits so rows line up", () => {
    expect(formatDateTime("2026-01-05T09:04:00Z")).toBe("2026/01/05 09:04");
  });

  it("emits no directional marks, which is what scrambled the log", () => {
    expect(formatDateTime("2026-08-14T15:18:00Z")).toMatch(/^[\d/: ]+$/);
  });

  it("drops the time when only the day is asked for", () => {
    expect(formatDate("2026-08-14T15:18:00Z")).toBe("2026/08/14");
  });

  it("uses a 24 hour clock with no am/pm marker to reorder", () => {
    expect(formatTime("2026-08-14T15:18:00Z")).toBe("15:18");
  });

  it("pads the hour", () => {
    expect(formatTime("2026-08-14T09:05:00Z")).toBe("09:05");
  });

  it("reads a late instant as the club's day, not the reader's", () => {
    expect(formatDate("2026-08-14T23:30:00Z")).toBe("2026/08/14");
    expect(formatTime("2026-08-14T23:30:00Z")).toBe("23:30");
  });

  it("accepts a Date as readily as a string", () => {
    expect(formatDateTime(new Date("2026-08-14T15:18:00Z"))).toBe("2026/08/14 15:18");
  });
});

describe("drawing a rollup key as a date", () => {
  it("keeps the day the key already names", () => {
    expect(formatDayKey("2026-08-14")).toBe("2026/08/14");
  });

  it("does not slip to the previous day", () => {
    expect(formatDayKey("2026-01-01")).toBe("2026/01/01");
  });

  it("emits no directional marks, the rows it fills are dir=ltr", () => {
    expect(formatDayKey("2026-08-14")).toMatch(/^[\d/]+$/);
  });

  it("draws the same day a key names it", () => {
    const at = "2026-08-24T23:30:00Z";
    expect(formatDayKey(matchDateKey(at))).toBe(formatDate(at));
  });
});

describe("naming a month and a day on the club's calendar", () => {
  it("gives the Arabic month the association writes", () => {
    expect(formatMonthName("2026-09-07T12:00:00Z")).toBe("سبتمبر");
    expect(formatMonthName("2026-01-07T12:00:00Z")).toBe("يناير");
  });

  it("reads the calendar day the club is on, not the reader's", () => {
    expect(clubDayParts("2026-09-07T23:30:00Z")).toEqual({ year: 2026, month: 8, day: 7 });
  });

  it("counts months from zero, the way a Date does", () => {
    expect(clubDayParts("2026-01-01T00:00:00Z").month).toBe(0);
  });
});

describe("heading a day in long Arabic", () => {
  it("says which year, so two seasons do not head their days alike", () => {
    expect(formatLongDate("2026-09-07T12:00:00.000Z")).toContain("2026");
    expect(formatLongDate("2027-09-06T12:00:00.000Z")).toContain("2027");
  });

  it("keeps the long weekday and month it was written for", () => {
    const label = formatLongDate("2026-09-07T12:00:00.000Z");

    expect(label).toContain("الاثنين");
    expect(label).toContain("سبتمبر");
  });

  it("says it in one sentence with the year last", () => {
    expect(formatLongDate("2026-09-07T12:00:00.000Z")).toBe("الاثنين، 7 سبتمبر 2026");
  });

  it("carries no directional marks of its own", () => {
    expect(formatLongDate("2026-09-07T12:00:00.000Z")).not.toMatch(/[\u200b-\u200f]/);
  });

  it("reads the club's day, not the reader's", () => {
    expect(formatLongDate("2026-09-07T23:30:00.000Z")).toContain("7 سبتمبر");
  });

  it("stays empty when a day has no date yet", () => {
    expect(formatLongDate(null)).toBe("");
  });
});
