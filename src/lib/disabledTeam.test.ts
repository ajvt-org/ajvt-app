import { describe, it, expect } from "vitest";
import { matchIsDisabled, teamIsDisabled } from "./disabledTeam";

describe("a disabled side", () => {
  it("reads a stamped moment as disabled", () => {
    expect(teamIsDisabled({ disabledAt: new Date() })).toBe(true);
    expect(teamIsDisabled({ disabledAt: "2026-09-19T00:00:00.000Z" })).toBe(true);
  });

  it("reads an empty moment, a missing field and a missing side as counting", () => {
    expect(teamIsDisabled({ disabledAt: null })).toBe(false);
    expect(teamIsDisabled({})).toBe(false);
    expect(teamIsDisabled(null)).toBe(false);
  });
});

describe("a match with a disabled side", () => {
  const off = { disabledAt: new Date() };
  const on = { disabledAt: null };

  it("counts either side", () => {
    expect(matchIsDisabled({ firstTeam: off, secondTeam: on })).toBe(true);
    expect(matchIsDisabled({ firstTeam: on, secondTeam: off })).toBe(true);
  });

  it("leaves a match between two counting teams alone", () => {
    expect(matchIsDisabled({ firstTeam: on, secondTeam: on })).toBe(false);
    expect(matchIsDisabled({ firstTeam: null, secondTeam: null })).toBe(false);
  });
});
