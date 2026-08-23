import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ResultForm from "./ResultForm";
import type { Match, Team } from "./types";

vi.mock("@/lib/api", () => ({
  api: { patch: vi.fn() },
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
  status: "SCHEDULED",
  goals: [],
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
