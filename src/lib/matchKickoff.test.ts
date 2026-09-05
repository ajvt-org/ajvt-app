import { describe, it, expect } from "vitest";
import { kickoffPassed, resultEntryAllowed } from "./matchKickoff";

const NOW = new Date("2026-09-05T12:00:00.000Z");

describe("kickoffPassed", () => {
  it("treats a fixture with no date as playable", () => {
    expect(kickoffPassed(null, NOW)).toBe(true);
  });

  it("holds a fixture whose kickoff is still ahead", () => {
    expect(kickoffPassed("2026-09-05T12:00:01.000Z", NOW)).toBe(false);
  });

  it("opens a fixture at its kickoff", () => {
    expect(kickoffPassed("2026-09-05T12:00:00.000Z", NOW)).toBe(true);
  });

  it("counts an all day fixture from the start of its day", () => {
    expect(kickoffPassed("2026-09-05T00:00:00.000Z", NOW)).toBe(true);
    expect(kickoffPassed("2026-09-06T00:00:00.000Z", NOW)).toBe(false);
  });
});

describe("resultEntryAllowed", () => {
  it("keeps an entered result editable before the kickoff", () => {
    expect(resultEntryAllowed(true, "2026-12-01T18:00:00.000Z", NOW)).toBe(true);
  });

  it("refuses a first result before the kickoff", () => {
    expect(resultEntryAllowed(false, "2026-12-01T18:00:00.000Z", NOW)).toBe(false);
  });

  it("allows a first result once the kickoff has passed", () => {
    expect(resultEntryAllowed(false, "2026-09-05T11:59:59.000Z", NOW)).toBe(true);
  });
});
