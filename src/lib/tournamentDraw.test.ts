import { describe, it, expect } from "vitest";
import { dealIntoGroups, groupsAreEven, holdsEveryTeamOnce, swapTeams } from "./tournamentDraw";

const teams = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}` }));

const ids = (groups: { teams: { id: string }[] }[]) => groups.map((g) => g.teams.map((t) => t.id));

describe("dealIntoGroups", () => {
  it("deals twelve teams round by round into four groups", () => {
    expect(ids(dealIntoGroups(teams(12), 4))).toEqual([
      ["t1", "t5", "t9"],
      ["t2", "t6", "t10"],
      ["t3", "t7", "t11"],
      ["t4", "t8", "t12"],
    ]);
  });

  it("leaves every group the same size", () => {
    for (const [count, groupCount] of [
      [12, 2],
      [12, 4],
      [16, 4],
      [8, 2],
    ]) {
      const groups = dealIntoGroups(teams(count), groupCount);

      expect(groupsAreEven(groups)).toBe(true);
      expect(holdsEveryTeamOnce(groups, teams(count))).toBe(true);
    }
  });

  it("numbers the groups from zero", () => {
    expect(dealIntoGroups(teams(4), 2).map((g) => g.index)).toEqual([0, 1]);
  });
});

describe("swapTeams", () => {
  it("trades two teams between their groups", () => {
    const groups = dealIntoGroups(teams(8), 2);

    expect(ids(swapTeams(groups, "t1", "t2"))).toEqual([
      ["t2", "t3", "t5", "t7"],
      ["t1", "t4", "t6", "t8"],
    ]);
  });

  it("keeps the groups even", () => {
    const groups = swapTeams(dealIntoGroups(teams(12), 4), "t1", "t8");

    expect(groupsAreEven(groups)).toBe(true);
    expect(holdsEveryTeamOnce(groups, teams(12))).toBe(true);
  });

  it("leaves the draw alone when both teams are already in one group", () => {
    const groups = dealIntoGroups(teams(8), 2);

    expect(swapTeams(groups, "t1", "t3")).toBe(groups);
  });

  it("leaves the draw alone when a team is not in it", () => {
    const groups = dealIntoGroups(teams(8), 2);

    expect(swapTeams(groups, "t1", "t99")).toBe(groups);
  });
});

describe("groupsAreEven", () => {
  it("refuses an empty draw", () => {
    expect(groupsAreEven([])).toBe(false);
  });

  it("spots a group that has gained a team", () => {
    expect(
      groupsAreEven([
        { index: 0, teams: teams(3) },
        { index: 1, teams: teams(2) },
      ]),
    ).toBe(false);
  });
});

describe("holdsEveryTeamOnce", () => {
  it("spots a team placed twice", () => {
    expect(
      holdsEveryTeamOnce(
        [
          { index: 0, teams: [{ id: "t1" }, { id: "t1" }] },
          { index: 1, teams: [{ id: "t3" }, { id: "t4" }] },
        ],
        teams(4),
      ),
    ).toBe(false);
  });

  it("spots a team left out", () => {
    expect(
      holdsEveryTeamOnce(
        [
          { index: 0, teams: [{ id: "t1" }] },
          { index: 1, teams: [{ id: "t3" }] },
        ],
        teams(4),
      ),
    ).toBe(false);
  });
});
