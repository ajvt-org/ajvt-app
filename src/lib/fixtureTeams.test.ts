import { describe, it, expect } from "vitest";
import { fixtureName, teamName } from "./fixtureTeams";
import { publicTournament } from "./texts/publicTournament";

describe("teamName", () => {
  it("gives the name of a team that is known", () => {
    expect(teamName({ name: "النجم" })).toBe("النجم");
  });

  it("says the team is decided later when there is none", () => {
    expect(teamName(null)).toBe(publicTournament.teamDecidedLater);
  });
});

describe("fixtureName", () => {
  it("pairs two known teams", () => {
    expect(fixtureName({ homeTeam: { name: "النجم" }, awayTeam: { name: "الوحدة" } })).toBe(
      "النجم × الوحدة",
    );
  });

  it("pairs a known team with one that is not decided", () => {
    expect(fixtureName({ homeTeam: { name: "النجم" }, awayTeam: null })).toBe(
      `النجم × ${publicTournament.teamDecidedLater}`,
    );
  });

  it("pairs two teams that are not decided", () => {
    const later = publicTournament.teamDecidedLater;
    expect(fixtureName({ homeTeam: null, awayTeam: null })).toBe(`${later} × ${later}`);
  });
});
