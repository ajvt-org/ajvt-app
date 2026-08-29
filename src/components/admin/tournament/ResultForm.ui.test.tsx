import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import ResultForm from "./ResultForm";
import type { Match, Team } from "./types";
import { matchAdmin as texts } from "@/lib/texts";

const patchMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { patch: (...args: unknown[]) => patchMock(...args) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const MATCH: Match = {
  id: "m1",
  homeTeam: { id: "t1", name: "الصقور", logo: null },
  awayTeam: { id: "t2", name: "النسور", logo: null },
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
};

function team(id: string, name: string, members: [string, string][]): Team {
  return {
    id,
    name,
    autoNamed: false,
    logo: null,
    groupId: null,
    group: null,
    members: members.map(([mid, fullName]) => ({
      status: "ACTIVE",
      member: { id: mid, fullName, phone: "36000001", age: "البدريين", photo: null },
    })),
  };
}

const TEAMS = [
  team("t1", "الصقور", [
    ["p1", "سالم"],
    ["p2", "عثمان"],
  ]),
  team("t2", "النسور", [["p3", "خالد"]]),
];

describe("ResultForm with a suspended player", () => {
  it("keeps him out of the pickers and says why", () => {
    render(
      <ResultForm
        match={MATCH}
        teams={TEAMS}
        profile="FOOTBALL"
        suspendedIds={["p1"]}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByText(/موقوفون عن هذه المباراة: سالم/)).toBeDefined();
    expect(screen.queryByRole("option", { name: "سالم" })).toBeNull();
    expect(screen.getAllByRole("option", { name: "عثمان" }).length).toBeGreaterThan(0);
  });

  it("says nothing when nobody is suspended", () => {
    render(
      <ResultForm
        match={MATCH}
        teams={TEAMS}
        profile="FOOTBALL"
        suspendedIds={[]}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.queryByText(/موقوفون عن هذه المباراة/)).toBeNull();
    expect(screen.getAllByRole("option", { name: "سالم" }).length).toBeGreaterThan(0);
  });
});

describe("ResultForm as goal events", () => {
  beforeEach(() => {
    cleanup();
    patchMock.mockReset().mockResolvedValue({});
  });

  function show(over: Partial<Match> = {}) {
    render(
      <ResultForm
        match={{ ...MATCH, ...over }}
        teams={TEAMS}
        profile="FOOTBALL"
        suspendedIds={[]}
        onSaved={vi.fn()}
      />,
    );
  }

  it("computes the score from the added goals", async () => {
    show();

    fireEvent.click(screen.getByRole("button", { name: texts.addGoal }));

    expect(await screen.findByText(/الصقور — مجهول/)).toBeDefined();
    expect(document.querySelector('[aria-live="polite"]')?.textContent).toContain("1-0");
  });

  it("offers the other roster for an عكسي goal", () => {
    show();

    const kindSelect = screen.getByDisplayValue("هدف");
    fireEvent.change(kindSelect, { target: { value: "OWN_GOAL" } });

    expect(screen.getAllByRole("option", { name: "خالد" }).length).toBeGreaterThan(1);
  });

  it("opens the shootout only on a tied knockout match", () => {
    show({ isKnockout: true });
    expect(screen.getByText("ركلات الترجيح")).toBeDefined();

    cleanup();
    show({ isKnockout: false });
    expect(screen.queryByText("ركلات الترجيح")).toBeNull();
  });

  it("saves the events, never a typed score", async () => {
    show();

    fireEvent.click(screen.getByRole("button", { name: texts.addGoal }));
    fireEvent.click(screen.getByText("حفظ النتيجة"));

    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    const body = patchMock.mock.calls[0][1] as Record<string, unknown>;
    expect(body.goalEvents).toEqual([
      { teamId: "t1", memberId: null, kind: "GOAL", period: "REGULAR", minute: null },
    ]);
    expect(body.homeScore).toBeUndefined();
  });

  it("keeps the plain score form for a board match", () => {
    render(
      <ResultForm
        match={MATCH}
        teams={TEAMS}
        profile="BOARD"
        suspendedIds={[]}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.queryByText("الأهداف")).toBeNull();
    expect(screen.getAllByRole("spinbutton").length).toBe(2);
  });
});

describe("the goal form", () => {
  it("names every control it asks for", () => {
    cleanup();
    render(
      <ResultForm
        match={MATCH}
        teams={TEAMS}
        profile="FOOTBALL"
        suspendedIds={[]}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getAllByLabelText(texts.fieldTeam).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(texts.fieldKind).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(texts.fieldScorer).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(texts.fieldMinute).length).toBeGreaterThan(0);
  });

  it("says where an own goal scorer comes from", () => {
    cleanup();
    render(
      <ResultForm
        match={MATCH}
        teams={TEAMS}
        profile="FOOTBALL"
        suspendedIds={[]}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.queryByText(texts.ownGoalHint)).toBeNull();
    fireEvent.change(screen.getAllByLabelText(texts.fieldKind)[0], {
      target: { value: "OWN_GOAL" },
    });
    expect(screen.getByText(texts.ownGoalHint)).toBeDefined();
  });
});
