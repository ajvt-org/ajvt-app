import { describe, it, expect } from "vitest";
import { playersMayBuildTeams } from "./teamBuilding";

const tournament = (over: Partial<Parameters<typeof playersMayBuildTeams>[0]> = {}) => ({
  isTournament: true,
  minTeamSize: 5,
  maxTeamSize: 7,
  playersBuildTeams: true,
  ...over,
});

describe("who builds the teams of a tournament", () => {
  it("is the players once the tournament says so", () => {
    expect(playersMayBuildTeams(tournament())).toBe(true);
  });

  it("is the admin while the switch is off", () => {
    expect(playersMayBuildTeams(tournament({ playersBuildTeams: false }))).toBe(false);
  });

  it("is nobody on an activity that is not a tournament", () => {
    expect(playersMayBuildTeams(tournament({ isTournament: false }))).toBe(false);
  });

  it("is nobody on a singles tournament, where a registrant is their own entrant", () => {
    expect(playersMayBuildTeams(tournament({ minTeamSize: 1, maxTeamSize: 1 }))).toBe(false);
  });

  it("holds for a tournament that sets no squad size at all", () => {
    expect(playersMayBuildTeams(tournament({ minTeamSize: null, maxTeamSize: null }))).toBe(true);
  });
});
