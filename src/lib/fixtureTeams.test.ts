import { describe, it, expect } from "vitest";
import { bothTeamsKnown, fixtureName, teamName } from "./fixtureTeams";
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
    expect(fixtureName({ firstTeam: { name: "النجم" }, secondTeam: { name: "الوحدة" } })).toBe(
      "النجم × الوحدة",
    );
  });

  it("pairs a known team with one that is not decided", () => {
    expect(fixtureName({ firstTeam: { name: "النجم" }, secondTeam: null })).toBe(
      `النجم × ${publicTournament.teamDecidedLater}`,
    );
  });

  it("pairs two teams that are not decided", () => {
    const later = publicTournament.teamDecidedLater;
    expect(fixtureName({ firstTeam: null, secondTeam: null })).toBe(`${later} × ${later}`);
  });
});

describe("bothTeamsKnown", () => {
  it("holds when both teams are set", () => {
    expect(bothTeamsKnown({ firstTeam: { name: "النجم" }, secondTeam: { name: "الوحدة" } })).toBe(
      true,
    );
  });

  it("fails when one side is still waiting", () => {
    expect(bothTeamsKnown({ firstTeam: { name: "النجم" }, secondTeam: null })).toBe(false);
    expect(bothTeamsKnown({ firstTeam: null, secondTeam: { name: "الوحدة" } })).toBe(false);
  });

  it("keeps the rest of the fixture out of the way", () => {
    const decided = [
      { id: "m1", firstTeam: { name: "النجم" }, secondTeam: { name: "الوحدة" } },
      { id: "m2", firstTeam: null, secondTeam: null },
    ].filter(bothTeamsKnown);

    expect(decided.map((m) => m.firstTeam.name)).toEqual(["النجم"]);
  });
});
