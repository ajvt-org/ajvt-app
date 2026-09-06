import { describe, it, expect } from "vitest";
import { matchesState } from "./matchesState";
import type { Group, Match } from "./types";

const group = (id: string, capacity: number | null = 2): Group => ({ id, name: id, capacity });

const match = (over: Partial<Match> = {}): Match => ({
  id: "m",
  firstTeam: { id: "t1", name: "t1", logo: null },
  secondTeam: { id: "t2", name: "t2", logo: null },
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
  forfeitWinnerTeamId: null,
  status: "SCHEDULED",
  goals: [],
  penaltyKicks: [],
  bookings: [],
  parts: [],
  adjustments: [],
  series: null,
  mvpVote: null,
  ...over,
});

const played = (over: Partial<Match> = {}) => match({ status: "PLAYED", ...over });

describe("a knockout tournament", () => {
  const base = { format: "KNOCKOUT" as const, groups: [], matches: [] };

  it("never locks the draw behind a group stage", () => {
    expect(matchesState(base).knockoutLocked).toBe(false);
  });

  it("is not the two-group format", () => {
    expect(matchesState(base).isTwoGroupFormat).toBe(false);
  });

  it("never proposes semis from groups", () => {
    const state = matchesState({ ...base, matches: [played()] });
    expect(state.groupStageComplete).toBe(false);
  });
});

describe("a groups-then-knockout tournament", () => {
  const twoGroups = [group("g1"), group("g2")];

  it("locks the draw until every group match is played", () => {
    const state = matchesState({
      format: "GROUPS_THEN_KNOCKOUT",
      groups: twoGroups,
      matches: [played({ id: "a" }), match({ id: "b" })],
    });

    expect(state.knockoutLocked).toBe(true);
    expect(state.groupStageComplete).toBe(false);
  });

  it("offers the semis once the group stage is done", () => {
    const state = matchesState({
      format: "GROUPS_THEN_KNOCKOUT",
      groups: twoGroups,
      matches: [played({ id: "a" }), played({ id: "b" })],
    });

    expect(state.groupStageComplete).toBe(true);
    expect(state.knockoutLocked).toBe(false);
  });

  it("does not offer the semis with three groups, which the API refuses", () => {
    const state = matchesState({
      format: "GROUPS_THEN_KNOCKOUT",
      groups: [group("g1"), group("g2"), group("g3")],
      matches: [played({ id: "a" }), played({ id: "b" })],
    });

    expect(state.isTwoGroupFormat).toBe(false);
    expect(state.groupStageComplete).toBe(false);
  });

  it("stops offering the semis once a bracket exists", () => {
    const state = matchesState({
      format: "GROUPS_THEN_KNOCKOUT",
      groups: twoGroups,
      matches: [played({ id: "a" }), match({ id: "s", bracketRound: 1, isKnockout: true })],
    });

    expect(state.groupStageComplete).toBe(false);
  });
});

describe("advancing the bracket", () => {
  const base = { format: "KNOCKOUT" as const, groups: [] };

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

const waiting = (id: string, bracketRound: number) =>
  match({ id, bracketRound, isKnockout: true, firstTeam: null, secondTeam: null });

const drawn = (id: string, bracketRound: number, over: Partial<Match> = {}) =>
  match({ id, bracketRound, isKnockout: true, ...over });

describe("a bracket laid out before the teams are known", () => {
  const groups = [group("g1"), group("g2")];
  const groupStage = [played({ id: "l1" }), played({ id: "l2" })];
  const base = { format: "GROUPS_THEN_KNOCKOUT" as const, groups };

  const acrossTwoRounds = [waiting("b1", 1), waiting("b2", 1), waiting("b3", 2)];

  it("sees a first round that is waiting", () => {
    const state = matchesState({ ...base, matches: [...groupStage, ...acrossTwoRounds] });

    expect(state.firstRoundWaiting).toBe(true);
    expect(state.firstRoundRedoable).toBe(false);
  });

  it("offers the semi final draw once the groups are done", () => {
    const state = matchesState({ ...base, matches: [...groupStage, ...acrossTwoRounds] });

    expect(state.groupStageComplete).toBe(true);
  });

  it("holds the draw back while a group match is still to play", () => {
    const state = matchesState({
      ...base,
      matches: [played({ id: "l1" }), match({ id: "l2" }), ...acrossTwoRounds],
    });

    expect(state.knockoutLocked).toBe(true);
    expect(state.groupStageComplete).toBe(false);
    expect(state.firstRoundWaiting).toBe(true);
  });

  it("does not offer the next round while nothing has been drawn", () => {
    const state = matchesState({ ...base, matches: [...groupStage, ...acrossTwoRounds] });

    expect(state.canAdvanceBracket).toBe(false);
  });

  it("turns from waiting to redoable once the first round is drawn", () => {
    const state = matchesState({
      ...base,
      matches: [...groupStage, drawn("b1", 1), drawn("b2", 1), waiting("b3", 2)],
    });

    expect(state.firstRoundWaiting).toBe(false);
    expect(state.firstRoundRedoable).toBe(true);
    expect(state.groupStageComplete).toBe(false);
    expect(state.canAdvanceBracket).toBe(true);
  });

  it("stops offering a redo once a knockout result is in", () => {
    const state = matchesState({
      ...base,
      matches: [
        ...groupStage,
        drawn("b1", 1, { status: "PLAYED" }),
        drawn("b2", 1),
        waiting("b3", 2),
      ],
    });

    expect(state.firstRoundRedoable).toBe(false);
    expect(state.firstRoundWaiting).toBe(false);
  });
});

describe("a knockout tournament laid out before the teams are known", () => {
  const base = { format: "KNOCKOUT" as const, groups: [] };

  it("offers the draw on a bracket that is more than one round long", () => {
    const state = matchesState({
      ...base,
      matches: [waiting("b1", 1), waiting("b2", 1), waiting("b3", 2)],
    });

    expect(state.firstRoundWaiting).toBe(true);
    expect(state.knockoutLocked).toBe(false);
  });
});
