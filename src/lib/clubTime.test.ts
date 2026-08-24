import { describe, it, expect } from "vitest";
import {
  CLUB_TIMEZONE,
  clubOffsetMs,
  formatMatchDateTime,
  formatMatchTime,
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
    expect(formatMatchTime(parseMatchDate("2026-08-24T20:00"))).toBe("20:00");
  });

  it("keeps it during Ramadan too", () => {
    expect(formatMatchTime(parseMatchDate("2026-03-15T20:00"))).toBe("20:00");
  });

  it("accepts seconds", () => {
    expect(formatMatchTime(parseMatchDate("2026-08-24T20:00:00"))).toBe("20:00");
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
      expect(formatMatchTime(stored)).toBe(matchDateToLocalInput(stored).slice(11, 16));
    }
  });
});

describe("naming the day a kickoff belongs to", () => {
  it("files a late kickoff under the day the club is still in", () => {
    expect(matchDateKey("2026-08-24T23:30:00Z")).toBe("2026-08-24");
  });

  it("spells a kickoff out in full", () => {
    expect(formatMatchDateTime("2026-08-24T19:00:00Z")).toBe("2026/08/24 19:00");
  });

  it("reports today as a calendar day", () => {
    expect(todayClubDateKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
