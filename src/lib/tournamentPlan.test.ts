import { describe, it, expect } from "vitest";
import { planTournament } from "./tournamentPlan";
import { groupRoundRobin, groupRoundSizes } from "./tournamentFixtures";
import { dealIntoGroups } from "./tournamentDraw";
import { fromClubWallClock } from "./clubTime";

const START = fromClubWallClock(Date.UTC(2026, 8, 10));
const TIMES = ["16:00", "18:00"];

function sizesFor(teamCount: number, groupCount: number): number[] {
  const teams = Array.from({ length: teamCount }, (_, i) => ({ id: `t${i + 1}` }));
  const groups = dealIntoGroups(teams, groupCount).map((g) => ({
    index: g.index,
    teamIds: g.teams.map((t) => t.id),
  }));
  return groupRoundSizes(groupRoundRobin(groups));
}

describe("planTournament", () => {
  it("lays a group stage then every knockout round down to the final", () => {
    const plan = planTournament({
      startsAt: START,
      times: TIMES,
      groupRoundSizes: [2, 2],
      qualifierCount: 4,
    });

    expect(plan.slots.map((s) => `${s.stage}${s.round}`)).toEqual([
      "GROUP1",
      "GROUP1",
      "GROUP2",
      "GROUP2",
      "KNOCKOUT1",
      "KNOCKOUT1",
      "KNOCKOUT2",
    ]);
  });

  it("gives each round its own day and each match its slot", () => {
    const plan = planTournament({
      startsAt: START,
      times: TIMES,
      groupRoundSizes: [2],
      qualifierCount: 2,
    });

    expect(plan.slots.map((s) => [s.dayPosition, s.time])).toEqual([
      [1, "16:00"],
      [1, "18:00"],
      [2, "16:00"],
    ]);
  });

  it("counts the days it needs and ends the tournament on the last one", () => {
    const plan = planTournament({
      startsAt: START,
      times: TIMES,
      groupRoundSizes: [2],
      qualifierCount: 2,
    });

    expect(plan.dayCount).toBe(2);
    expect(plan.endsAt?.toISOString().slice(0, 10)).toBe("2026-09-11");
  });

  it("sets a kick off on the right day at the right club time", () => {
    const plan = planTournament({
      startsAt: START,
      times: TIMES,
      groupRoundSizes: [1],
      qualifierCount: 2,
    });

    expect(plan.slots[0].kickOff.toISOString()).toBe("2026-09-10T16:00:00.000Z");
    expect(plan.slots[1].kickOff.toISOString()).toBe("2026-09-11T16:00:00.000Z");
  });

  it("spills a round wider than the slots onto the next day", () => {
    const plan = planTournament({
      startsAt: START,
      times: ["16:00"],
      groupRoundSizes: [3],
      qualifierCount: 2,
    });

    expect(plan.slots.filter((s) => s.stage === "GROUP").map((s) => s.dayPosition)).toEqual([
      1, 2, 3,
    ]);
    expect(plan.dayCount).toBe(4);
  });

  it("plans twelve teams in four groups the whole way to the final", () => {
    const plan = planTournament({
      startsAt: START,
      times: TIMES,
      groupRoundSizes: sizesFor(12, 4),
      qualifierCount: 8,
    });

    expect(plan.slots.filter((s) => s.stage === "GROUP")).toHaveLength(12);
    expect(plan.slots.filter((s) => s.stage === "KNOCKOUT").map((s) => s.round)).toEqual([
      1, 1, 1, 1, 2, 2, 3,
    ]);
    expect(plan.endsAt).not.toBeNull();
  });

  it("plans a knockout with no group stage at all", () => {
    const plan = planTournament({
      startsAt: START,
      times: TIMES,
      groupRoundSizes: [],
      qualifierCount: 8,
    });

    expect(plan.slots.every((s) => s.stage === "KNOCKOUT")).toBe(true);
    expect(plan.slots).toHaveLength(7);
    expect(plan.slots[0].round).toBe(1);
  });

  it("has nothing to lay out for a qualifier count that does not halve", () => {
    const plan = planTournament({
      startsAt: START,
      times: TIMES,
      groupRoundSizes: [],
      qualifierCount: 6,
    });

    expect(plan.slots).toEqual([]);
    expect(plan.dayCount).toBe(0);
    expect(plan.endsAt).toBeNull();
  });

  it("numbers the matches inside a round from zero", () => {
    const plan = planTournament({
      startsAt: START,
      times: TIMES,
      groupRoundSizes: [],
      qualifierCount: 4,
    });

    expect(plan.slots.map((s) => s.indexInRound)).toEqual([0, 1, 0]);
  });
});
