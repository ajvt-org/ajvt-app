import { describe, it, expect } from "vitest";
import { matchesState } from "./matchesState";
import type { Group, Match, Team } from "./types";

const team = (id: string, groupId: string | null = null): Team => ({
  id,
  name: id,
  autoNamed: false,
  logo: null,
  groupId,
  group: null,
  members: [],
});

const group = (id: string, capacity: number | null = 2): Group => ({ id, name: id, capacity });

const match = (over: Partial<Match> = {}): Match => ({
  id: "m",
  homeTeam: { id: "t1", name: "t1", logo: null },
  awayTeam: { id: "t2", name: "t2", logo: null },
  matchDate: null,
  round: null,
  venue: null,
  order: 0,
  isKnockout: false,
  bracketRound: null,
  homeScore: null,
  awayScore: null,
  homePenalties: null,
  awayPenalties: null,
  manOfTheMatch: null,
  status: "SCHEDULED",
  goals: [],
  bookings: [],
  mvpVote: null,
  ...over,
});

const played = (over: Partial<Match> = {}) => match({ status: "PLAYED", ...over });

describe("a knockout tournament", () => {
  const base = { format: "KNOCKOUT" as const, groups: [], teams: [], matches: [] };

  it("never locks the draw behind a group stage", () => {
    expect(matchesState(base).knockoutLocked).toBe(false);
  });

  it("is not the two-group format", () => {
    expect(matchesState(base).isTwoGroupFormat).toBe(false);
  });

  it("never proposes pools or semis from groups", () => {
    const state = matchesState({ ...base, matches: [played()] });
    expect(state.poolsReady).toBe(false);
    expect(state.groupStageComplete).toBe(false);
  });
});

describe("a groups-then-knockout tournament", () => {
  const twoGroups = [group("g1"), group("g2")];
  const teams = [team("t1", "g1"), team("t2", "g1"), team("t3", "g2"), team("t4", "g2")];

  it("offers the schedule once every pool is filled and nothing is played", () => {
    const state = matchesState({
      format: "GROUPS_THEN_KNOCKOUT",
      groups: twoGroups,
      teams,
      matches: [],
    });

    expect(state.poolsReady).toBe(true);
  });

  it("locks the draw until every group match is played", () => {
    const state = matchesState({
      format: "GROUPS_THEN_KNOCKOUT",
      groups: twoGroups,
      teams,
      matches: [played({ id: "a" }), match({ id: "b" })],
    });

    expect(state.knockoutLocked).toBe(true);
    expect(state.groupStageComplete).toBe(false);
  });

  it("offers the semis once the group stage is done", () => {
    const state = matchesState({
      format: "GROUPS_THEN_KNOCKOUT",
      groups: twoGroups,
      teams,
      matches: [played({ id: "a" }), played({ id: "b" })],
    });

    expect(state.groupStageComplete).toBe(true);
    expect(state.knockoutLocked).toBe(false);
  });

  it("does not offer the semis with three groups, which the API refuses", () => {
    const state = matchesState({
      format: "GROUPS_THEN_KNOCKOUT",
      groups: [group("g1"), group("g2"), group("g3")],
      teams,
      matches: [played({ id: "a" }), played({ id: "b" })],
    });

    expect(state.isTwoGroupFormat).toBe(false);
    expect(state.groupStageComplete).toBe(false);
  });

  it("stops offering the semis once a bracket exists", () => {
    const state = matchesState({
      format: "GROUPS_THEN_KNOCKOUT",
      groups: twoGroups,
      teams,
      matches: [played({ id: "a" }), match({ id: "s", bracketRound: 1, isKnockout: true })],
    });

    expect(state.groupStageComplete).toBe(false);
  });
});

describe("advancing the bracket", () => {
  const base = { format: "KNOCKOUT" as const, groups: [], teams: [] };

  it("has nothing to advance without a bracket", () => {
    expect(matchesState({ ...base, matches: [] }).canAdvanceBracket).toBe(false);
  });

  it("can advance while a round is still open", () => {
    const state = matchesState({
      ...base,
      matches: [
        match({ id: "a", bracketRound: 1, isKnockout: true }),
        match({ id: "b", bracketRound: 1, isKnockout: true }),
      ],
    });

    expect(state.canAdvanceBracket).toBe(true);
    expect(state.maxBracketRound).toBe(1);
  });

  it("stops once the single last match is played", () => {
    const state = matchesState({
      ...base,
      matches: [played({ id: "final", bracketRound: 2, isKnockout: true })],
    });

    expect(state.canAdvanceBracket).toBe(false);
  });
});
