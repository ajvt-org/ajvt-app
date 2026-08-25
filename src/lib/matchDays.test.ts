import { describe, it, expect } from "vitest";
import { groupMatchesByDay, formatDayLabel, UNDATED_LABEL } from "./matchDays";

function match(matchDate: string | null, round: string | null = null, venue: string | null = null) {
  return { matchDate, round, venue };
}

describe("grouping fixtures into match days", () => {
  it("puts a day's matches under one heading", () => {
    const days = groupMatchesByDay([
      match("2026-08-24T16:00:00Z"),
      match("2026-08-24T17:00:00Z"),
      match("2026-08-25T16:00:00Z"),
    ]);

    expect(days).toHaveLength(2);
    expect(days[0].matches).toHaveLength(2);
    expect(days[1].matches).toHaveLength(1);
  });

  it("orders the days, and the kickoffs inside a day", () => {
    const days = groupMatchesByDay([
      match("2026-08-25T16:00:00Z"),
      match("2026-08-24T17:00:00Z"),
      match("2026-08-24T16:00:00Z"),
    ]);

    expect(days.map((d) => d.key)).toEqual(["2026-08-24", "2026-08-25"]);
    expect(days[0].matches.map((m) => m.matchDate)).toEqual([
      "2026-08-24T16:00:00Z",
      "2026-08-24T17:00:00Z",
    ]);
  });

  it("lifts the round and the ground the whole day agrees on", () => {
    const days = groupMatchesByDay([
      match("2026-08-24T16:00:00Z", "الجولة 1", "ملعب كوتش"),
      match("2026-08-24T17:00:00Z", "الجولة 1", "ملعب كوتش"),
    ]);

    expect(days[0].round).toBe("الجولة 1");
    expect(days[0].venue).toBe("ملعب كوتش");
  });

  it("leaves them on the rows when the day does not agree", () => {
    const days = groupMatchesByDay([
      match("2026-08-24T16:00:00Z", "الجولة 1", "ملعب كوتش"),
      match("2026-08-24T17:00:00Z", "الجولة 2", "ملعب آخر"),
    ]);

    expect(days[0].round).toBeNull();
    expect(days[0].venue).toBeNull();
  });

  it("hoists nothing when one match of the day is missing the detail", () => {
    const days = groupMatchesByDay([
      match("2026-08-24T16:00:00Z", "الجولة 1", "ملعب كوتش"),
      match("2026-08-24T17:00:00Z", "الجولة 1", null),
    ]);

    expect(days[0].round).toBe("الجولة 1");
    expect(days[0].venue).toBeNull();
  });

  it("keeps undated matches together at the end", () => {
    const days = groupMatchesByDay([
      match(null),
      match("2026-08-24T16:00:00Z"),
      match("2026-08-25T16:00:00Z"),
    ]);

    expect(days.map((d) => d.label).at(-1)).toBe(UNDATED_LABEL);
    expect(days.at(-1)!.matches).toHaveLength(1);
  });

  it("files a late kickoff under the club's day, not the reader's", () => {
    const days = groupMatchesByDay([match("2026-08-24T23:30:00Z")]);

    expect(days[0].key).toBe("2026-08-24");
  });
});

describe("naming a match day", () => {
  it("reads as a weekday, a date and a month in Arabic", () => {
    expect(formatDayLabel("2026-08-24T16:00:00Z")).toBe("الاثنين 24 أغسطس");
  });

  it("names the day the club is in when the two disagree", () => {
    expect(formatDayLabel("2026-08-24T23:30:00Z")).toBe("الاثنين 24 أغسطس");
  });
});
