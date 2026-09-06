import { describe, it, expect } from "vitest";
import { hasStandings } from "./tournamentFormat";

describe("hasStandings", () => {
  it("says no for a knockout", () => {
    expect(hasStandings("KNOCKOUT")).toBe(false);
  });

  it("says yes for a group stage followed by a knockout", () => {
    expect(hasStandings("GROUPS_THEN_KNOCKOUT")).toBe(true);
  });

  it("says yes when no format is set", () => {
    expect(hasStandings(null)).toBe(true);
  });
});
