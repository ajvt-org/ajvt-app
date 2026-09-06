import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import ResultForm from "./ResultForm";
import type { DecidedMatch, Team } from "./types";
import { matchAdmin as texts, seriesResult as seriesTexts } from "@/lib/texts";
import type { SeriesConfig } from "./seriesConfig";

const patchMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    patch: (...args: unknown[]) => patchMock(...args),
    get: async () => ({
      parts: [],
      standing: {
        sideAHalves: 0,
        sideBHalves: 0,
        partsRecorded: 0,
        partsScored: 0,
        partsLeft: 2,
        partsAllowed: 2,
        target: null,
        over: false,
        level: true,
        extending: false,
        winner: null,
      },
    }),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const SERIES: SeriesConfig = {
  partsPerMatch: 2,
  matchEnding: "PLAY_ALL",
  partsToWin: null,
  partDecision: "OUTCOME",
  partTarget: null,
  partWord: "لعبة",
  partsWord: "ألعاب",
  hasColours: false,
  firstColourWord: null,
  secondColourWord: null,
};

const MATCH: DecidedMatch = {
  id: "m1",
  firstTeam: { id: "t1", name: "الصقور", logo: null },
  secondTeam: { id: "t2", name: "النسور", logo: null },
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
};

function team(id: string, name: string, members: [string, string][]): Team {
  return {
    id,
    name,
    autoNamed: false,
    fromHomeVillage: true,
    logo: null,
    captainUserId: null,
    groupId: null,
    group: null,
    members: members.map(([mid, fullName]) => ({
      status: "ACTIVE",
      member: {
        id: mid,
        fullName,
        phone: "36000001",
        age: "البدريين",
        village: "التاكلالت",
        photo: null,
      },
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
        matchShape="FOOTBALL"
        activityId="a1"
        series={null}
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
        matchShape="FOOTBALL"
        activityId="a1"
        series={null}
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

  function show(over: Partial<DecidedMatch> = {}) {
    render(
      <ResultForm
        match={{ ...MATCH, ...over }}
        teams={TEAMS}
        matchShape="FOOTBALL"
        activityId="a1"
        series={null}
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
      { teamId: "t1", userId: null, kind: "GOAL", period: "REGULAR", minute: null },
    ]);
    expect(body.homeScore).toBeUndefined();
  });

  it("asks a series match for none of the football apparatus", () => {
    render(
      <ResultForm
        match={MATCH}
        teams={TEAMS}
        matchShape="SERIES"
        activityId="a1"
        series={SERIES}
        suspendedIds={[]}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.queryByText("الأهداف")).toBeNull();
  });

  it("sends a series admin to the setup before its parts are described", () => {
    render(
      <ResultForm
        match={MATCH}
        teams={TEAMS}
        matchShape="SERIES"
        activityId="a1"
        series={null}
        suspendedIds={[]}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByText(seriesTexts.notConfigured)).toBeDefined();
    expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
  });
});

describe("the goal form", () => {
  it("names every control it asks for", () => {
    cleanup();
    render(
      <ResultForm
        match={MATCH}
        teams={TEAMS}
        matchShape="FOOTBALL"
        activityId="a1"
        series={null}
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
        matchShape="FOOTBALL"
        activityId="a1"
        series={null}
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

describe("the extra time section", () => {
  beforeEach(() => {
    cleanup();
    patchMock.mockReset().mockResolvedValue({});
  });

  function show(over: Partial<DecidedMatch> = {}) {
    render(
      <ResultForm
        match={{ ...MATCH, ...over }}
        teams={TEAMS}
        matchShape="FOOTBALL"
        activityId="a1"
        series={null}
        suspendedIds={[]}
        onSaved={vi.fn()}
      />,
    );
  }

  const goalRow = (teamId: string, period: "REGULAR" | "EXTRA_TIME") => ({
    id: `g-${teamId}-${period}`,
    count: 1,
    minute: null,
    teamId,
    kind: "GOAL" as const,
    period,
    member: null,
  });

  it("is not offered on a group-stage match", () => {
    show({ isKnockout: false });

    expect(screen.queryByText(texts.extraTimeToggle)).toBeNull();
  });

  it("is offered on a knockout still level after ninety minutes", () => {
    show({ isKnockout: true });

    expect(screen.getByText(texts.extraTimeToggle)).toBeDefined();
  });

  it("goes away once a goal decides the ninety minutes", () => {
    show({ isKnockout: true });

    fireEvent.click(screen.getByRole("button", { name: texts.addGoal }));

    expect(screen.queryByText(texts.extraTimeToggle)).toBeNull();
  });

  it("opens the section when the admin says the match went to extra time", () => {
    show({ isKnockout: true });

    fireEvent.click(screen.getByText(texts.extraTimeToggle));

    expect(screen.getByText(texts.extraTimeHeading)).toBeDefined();
  });

  it("stays open once an extra time goal breaks the tie", () => {
    show({
      isKnockout: true,
      goals: [goalRow("t1", "REGULAR"), goalRow("t2", "REGULAR"), goalRow("t1", "EXTRA_TIME")],
    });

    expect(screen.getByText(texts.extraTimeHeading)).toBeDefined();
    expect(screen.queryByText(texts.extraTimeBlocked)).toBeNull();
  });

  it("keeps goals the match no longer qualifies for visible, and blocks the save", () => {
    show({ isKnockout: false, goals: [goalRow("t1", "EXTRA_TIME")] });

    expect(screen.getByText(texts.extraTimeHeading)).toBeDefined();
    expect(screen.getByText(texts.extraTimeBlocked)).toBeDefined();
    expect(screen.getByText("حفظ النتيجة").closest("button")?.disabled).toBe(true);
  });
});

describe("the shootout", () => {
  beforeEach(() => {
    cleanup();
    patchMock.mockReset().mockResolvedValue({});
  });

  const kickRow = (teamId: string, order: number) => ({
    id: `k${order}`,
    teamId,
    order,
    scored: true,
    member: null,
  });

  function show(over: Partial<DecidedMatch> = {}) {
    render(
      <ResultForm
        match={{ ...MATCH, ...over }}
        teams={TEAMS}
        matchShape="FOOTBALL"
        activityId="a1"
        series={null}
        suspendedIds={[]}
        onSaved={vi.fn()}
      />,
    );
  }

  it("lets the admin pick who takes the first kick", () => {
    show({ isKnockout: true });

    expect(screen.getByLabelText(texts.firstKick)).toBeDefined();
  });

  it("hands the turn to the other side once a kick is in", () => {
    show({ isKnockout: true });

    fireEvent.click(screen.getByRole("button", { name: texts.addKick }));

    expect(screen.getByText(texts.kickTurn("النسور"))).toBeDefined();
    expect(screen.queryByLabelText(texts.firstKick)).toBeNull();
  });

  it("alternates again on the kick after that", () => {
    show({ isKnockout: true });

    fireEvent.click(screen.getByRole("button", { name: texts.addKick }));
    fireEvent.click(screen.getByRole("button", { name: texts.addKick }));

    expect(screen.getByText(texts.kickTurn("الصقور"))).toBeDefined();
  });

  it("offers to remove the last kick only", () => {
    show({ isKnockout: true, penaltyKicks: [kickRow("t1", 1), kickRow("t2", 2)] });

    expect(screen.getAllByRole("button", { name: texts.remove })).toHaveLength(1);
  });

  it("keeps a recorded shootout when a forfeit is awarded afterwards", async () => {
    show({
      isKnockout: true,
      forfeitWinnerTeamId: "t1",
      penaltyKicks: [kickRow("t1", 1), kickRow("t2", 2)],
    });

    fireEvent.click(screen.getByText("حفظ النتيجة"));

    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    const body = patchMock.mock.calls[0][1] as Record<string, unknown>;
    expect(body.penaltyKicks).toHaveLength(2);
  });

  it("keeps kicks visible on a match that stopped being level, and blocks the save", () => {
    show({
      isKnockout: true,
      goals: [
        {
          id: "g1",
          count: 1,
          minute: null,
          teamId: "t1",
          kind: "GOAL" as const,
          period: "REGULAR" as const,
          member: null,
        },
      ],
      penaltyKicks: [kickRow("t1", 1)],
    });

    expect(screen.getByText(texts.shootoutBlocked)).toBeDefined();
    expect(screen.getByText("حفظ النتيجة").closest("button")?.disabled).toBe(true);
  });
});
