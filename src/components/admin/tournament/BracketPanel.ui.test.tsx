import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
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

const waitingBracket = [
  match({ id: "b1", bracketRound: 1, isKnockout: true, firstTeam: null, secondTeam: null }),
  match({ id: "b2", bracketRound: 1, isKnockout: true, firstTeam: null, secondTeam: null }),
  match({ id: "b3", bracketRound: 2, isKnockout: true, firstTeam: null, secondTeam: null }),
];

const groups: Group[] = [
  { id: "g1", name: "المجموعة 1", capacity: 2 },
  { id: "g2", name: "المجموعة 2", capacity: 2 },
];

function show(
  matches: Match[],
  format: "KNOCKOUT" | "GROUPS_THEN_KNOCKOUT",
  withGroups = true,
  onAction = vi.fn(),
) {
  cleanup();
  const usedGroups = withGroups ? groups : [];
  render(
    <BracketPanel
      activityId="a1"
      busy={false}
      entrant="team"
      state={matchesState({ format, groups: usedGroups, matches })}
      onAction={onAction}
    />,
  );
  return onAction;
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

  it("keeps the heading beside a bracket that already exists", () => {
    show(waitingBracket, "KNOCKOUT", false);

    expect(screen.getByText(texts.bracketKnockout).textContent).toBe(texts.bracketKnockout);
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
        match({ id: "b3", bracketRound: 2, isKnockout: true, firstTeam: null, secondTeam: null }),
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

  it("is the draw button and nothing above it", () => {
    show([], "KNOCKOUT", false);

    expect(screen.getByText(texts.draw)).toBeDefined();
    expect(screen.queryByText(texts.bracketKnockout)).toBeNull();
    expect(document.querySelector(".card")).toBeNull();
  });

  it("tells the confirm what happens to whoever finds no opponent", () => {
    const onAction = show([], "KNOCKOUT", false);
    fireEvent.click(screen.getByText(texts.draw));

    expect(onAction).toHaveBeenCalledWith("draw", texts.entrant.team.confirmDraw);
    expect(texts.entrant.team.confirmDraw).toContain("الدور التالي");
  });

  it("asks a singles tournament about players rather than teams", () => {
    cleanup();
    const onAction = vi.fn();
    render(
      <BracketPanel
        activityId="a1"
        busy={false}
        entrant="player"
        state={matchesState({ format: "KNOCKOUT", groups: [], matches: [] })}
        onAction={onAction}
      />,
    );
    fireEvent.click(screen.getByText(texts.draw));

    expect(onAction).toHaveBeenCalledWith("draw", texts.entrant.player.confirmDraw);
  });
});
