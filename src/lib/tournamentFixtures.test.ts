import { describe, it, expect } from "vitest";
import { groupRoundRobin, groupRoundSizes, type GroupEntry } from "./tournamentFixtures";
import { dealIntoGroups } from "./tournamentDraw";

function groupsOf(teamCount: number, groupCount: number): GroupEntry[] {
  const teams = Array.from({ length: teamCount }, (_, i) => ({ id: `t${i + 1}` }));
  return dealIntoGroups(teams, groupCount).map((g) => ({
    index: g.index,
    teamIds: g.teams.map((t) => t.id),
  }));
}

function pairKey(f: { homeTeamId: string; awayTeamId: string }): string {
  return [f.homeTeamId, f.awayTeamId].sort().join("|");
}

describe("groupRoundRobin", () => {
  it("has every team meet every other team in its group once", () => {
    const groups = groupsOf(16, 4);
    const fixtures = groupRoundRobin(groups);

    expect(fixtures).toHaveLength(4 * 6);
    expect(new Set(fixtures.map(pairKey)).size).toBe(fixtures.length);
    for (const f of fixtures) {
      const group = groups[f.groupIndex];
      expect(group.teamIds).toContain(f.homeTeamId);
      expect(group.teamIds).toContain(f.awayTeamId);
    }
  });

  it("runs the same round across every group before the next one", () => {
    const fixtures = groupRoundRobin(groupsOf(12, 4));
    const rounds = fixtures.map((f) => f.round);

    expect(rounds).toEqual([...rounds].sort((a, b) => a - b));
    expect(fixtures.filter((f) => f.round === 1).map((f) => f.groupIndex)).toEqual([0, 1, 2, 3]);
  });

  it("keeps the groups in order inside a round", () => {
    const fixtures = groupRoundRobin(groupsOf(16, 4));

    for (let round = 1; round <= 3; round++) {
      const inRound = fixtures.filter((f) => f.round === round).map((f) => f.groupIndex);

      expect(inRound).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    }
  });

  it("gives a group of three a bye each round rather than a short schedule", () => {
    const fixtures = groupRoundRobin(groupsOf(12, 4));

    expect(fixtures).toHaveLength(4 * 3);
    expect(groupRoundSizes(fixtures)).toEqual([4, 4, 4]);
  });

  it("plays two groups of six over five rounds", () => {
    const fixtures = groupRoundRobin(groupsOf(12, 2));

    expect(groupRoundSizes(fixtures)).toEqual([6, 6, 6, 6, 6]);
  });

  it("has nothing to play with no groups", () => {
    expect(groupRoundRobin([])).toEqual([]);
    expect(groupRoundSizes([])).toEqual([]);
  });
});

describe("groupRoundSizes", () => {
  it("counts the matches each round carries", () => {
    expect(groupRoundSizes(groupRoundRobin(groupsOf(16, 4)))).toEqual([8, 8, 8]);
  });
});
