import { describe, it, expect } from "vitest";
import { isTournamentTab, tournamentPlayTabs, tournamentRosterTab } from "./tournamentTabs";

const football = { isTournament: true, profile: "FOOTBALL" as const, teamSize: 5 };
const board = { isTournament: true, profile: "BOARD" as const, teamSize: 1 };
const plain = { isTournament: false, profile: "FOOTBALL" as const, teamSize: null };

const keys = (t: { key: string }[]) => t.map((x) => x.key);

describe("which tournament tabs an activity earns", () => {
  it("gives an ordinary activity none at all", () => {
    expect(tournamentRosterTab(plain, 0)).toEqual([]);
    expect(tournamentPlayTabs(plain, 0)).toEqual([]);
  });

  it("gives a football tournament the full run of play, discipline last", () => {
    expect(keys(tournamentPlayTabs(football, 0))).toEqual([
      "days",
      "matches",
      "standings",
      "scorers",
      "discipline",
    ]);
  });

  it("keeps the roster apart from the play", () => {
    expect(keys(tournamentRosterTab(football, 0))).toEqual(["teams"]);
    expect(keys(tournamentPlayTabs(football, 0))).not.toContain("teams");
  });

  it("leaves discipline out of a board game, which has no cards", () => {
    expect(keys(tournamentPlayTabs(board, 0))).not.toContain("discipline");
  });

  it("counts the proposals waiting on the discipline tab", () => {
    const tab = tournamentPlayTabs(football, 3).find((t) => t.key === "discipline");

    expect(tab?.badge).toBe(3);
  });
});

describe("naming the squad tab", () => {
  it("says players when a side is one person", () => {
    const tab = tournamentRosterTab(board, 0)[0];

    expect(tab.label).toBe("اللاعبون");
    expect(tab.icon).toBe("user");
  });

  it("says teams otherwise", () => {
    const tab = tournamentRosterTab(football, 0)[0];

    expect(tab.label).toBe("الفرق");
    expect(tab.icon).toBe("users");
  });
});

describe("telling a tournament tab from an activity one", () => {
  it("knows its own", () => {
    for (const key of ["teams", "days", "matches", "standings", "scorers", "discipline"]) {
      expect(isTournamentTab(key)).toBe(true);
    }
  });

  it("leaves the activity tabs alone", () => {
    for (const key of ["details", "registrations", "finance", "log"]) {
      expect(isTournamentTab(key)).toBe(false);
    }
  });
});

describe("the badge on the teams tab", () => {
  const teamsTab = (requests: number) => tournamentRosterTab(football, requests)[0];

  it("carries the join requests still waiting", () => {
    expect(teamsTab(2)?.badge).toBe(2);
  });

  it("carries nothing when none are waiting", () => {
    expect(teamsTab(0)?.badge).toBe(0);
  });

  it("counts nothing when the caller says nothing", () => {
    expect(tournamentRosterTab(football)[0]?.badge).toBe(0);
  });
});
