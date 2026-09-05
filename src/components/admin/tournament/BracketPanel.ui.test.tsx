import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import BracketPanel from "./BracketPanel";
import { matchesState } from "./matchesState";
import { matchAdmin as texts } from "@/lib/texts";
import type { Group, Match } from "./types";

const get = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: (...args: unknown[]) => get(...args) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

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
  forfeitWinnerTeamId: null,
  status: "SCHEDULED",
  goals: [],
  penaltyKicks: [],
  bookings: [],
  mvpVote: null,
  ...over,
});

const waitingBracket = [
  match({ id: "b1", bracketRound: 1, isKnockout: true, homeTeam: null, awayTeam: null }),
  match({ id: "b2", bracketRound: 1, isKnockout: true, homeTeam: null, awayTeam: null }),
  match({ id: "b3", bracketRound: 2, isKnockout: true, homeTeam: null, awayTeam: null }),
];

const groups: Group[] = [
  { id: "g1", name: "المجموعة 1", capacity: 2 },
  { id: "g2", name: "المجموعة 2", capacity: 2 },
];

function show(matches: Match[], format: "KNOCKOUT" | "GROUPS_THEN_KNOCKOUT", withGroups = true) {
  cleanup();
  const usedGroups = withGroups ? groups : [];
  render(
    <BracketPanel
      activityId="a1"
      busy={false}
      state={matchesState({ format, groups: usedGroups, matches })}
      onAction={vi.fn()}
    />,
  );
}

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({
    pairs: [
      {
        home: { teamId: "t1", name: "t1", groupName: "المجموعة 1" },
        away: { teamId: "t4", name: "t4", groupName: "المجموعة 2" },
      },
      {
        home: { teamId: "t3", name: "t3", groupName: "المجموعة 2" },
        away: { teamId: "t2", name: "t2", groupName: "المجموعة 1" },
      },
    ],
    problem: null,
    label: "نصف النهائي",
    groupStageComplete: true,
    bracketExists: true,
    firstRoundWaiting: true,
  });
});

describe("a bracket whose first round is waiting", () => {
  const groupStage = [match({ id: "l1", status: "PLAYED" }), match({ id: "l2", status: "PLAYED" })];

  it("offers the semi final draw beside the tree", async () => {
    show([...groupStage, ...waitingBracket], "GROUPS_THEN_KNOCKOUT");

    expect(await screen.findByText(texts.suggestionValidate)).toBeDefined();
  });

  it("offers a plain draw where there are no groups", () => {
    show(waitingBracket, "KNOCKOUT", false);

    expect(screen.getByText(texts.draw)).toBeDefined();
  });

  it("offers neither the redo nor the next round", async () => {
    show([...groupStage, ...waitingBracket], "GROUPS_THEN_KNOCKOUT");

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(screen.queryByText(texts.regenerateSemis)).toBeNull();
    expect(screen.queryByText(texts.nextRound)).toBeNull();
  });

  it("leaves a drawn bracket to speak for itself while the group tables are open", () => {
    show([match({ id: "l1" }), ...waitingBracket], "GROUPS_THEN_KNOCKOUT");

    expect(screen.queryByText(new RegExp(texts.knockoutLockedHint))).toBeNull();
    expect(screen.queryByText(texts.suggestionValidate)).toBeNull();
    expect(screen.queryByText(texts.draw)).toBeNull();
  });

  it("swaps the draw for a redo once the first round is filled", () => {
    show(
      [
        ...groupStage,
        match({ id: "b1", bracketRound: 1, isKnockout: true }),
        match({ id: "b2", bracketRound: 1, isKnockout: true }),
        match({ id: "b3", bracketRound: 2, isKnockout: true, homeTeam: null, awayTeam: null }),
      ],
      "GROUPS_THEN_KNOCKOUT",
    );

    expect(screen.getByText(texts.regenerateSemis)).toBeDefined();
    expect(screen.getByText(texts.nextRound)).toBeDefined();
  });
});

describe("a bracket that has not been drawn at all", () => {
  it("says the knockout options arrive once the group stage is over", () => {
    show([match({ id: "l1" })], "GROUPS_THEN_KNOCKOUT");

    expect(screen.getByText(new RegExp(texts.knockoutLockedHint))).toBeDefined();
  });

  it("offers the draw instead of the hint once the group stage is over", () => {
    show([match({ id: "l1", status: "PLAYED" })], "GROUPS_THEN_KNOCKOUT");

    expect(screen.queryByText(new RegExp(texts.knockoutLockedHint))).toBeNull();
  });
});
