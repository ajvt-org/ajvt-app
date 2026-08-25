import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, cleanup as rtlCleanup } from "@testing-library/react";
import MatchResult from "./MatchResult";
import type { PublicMatch } from "./publicTypes";

function match(): PublicMatch {
  return {
    id: "m1",
    homeTeam: { id: "t1", name: "الصقور", logo: null },
    awayTeam: { id: "t2", name: "النسور", logo: null },
    matchDate: new Date("2026-08-20T16:00:00.000Z"),
    round: "النهائي",
    venue: "ملعب القرية",
    isKnockout: true,
    bracketRound: 2,
    order: 0,
    homeScore: 2,
    awayScore: 1,
    homePenalties: null,
    awayPenalties: null,
    status: "PLAYED",
    manOfTheMatch: { id: "p1", fullName: "أحمد ولد محمد", photo: null },
    goals: [
      {
        count: 1,
        minute: 12,
        teamId: "t1",
        kind: "GOAL",
        period: "REGULAR",
        member: { id: "p1", fullName: "أحمد ولد محمد", photo: null },
      },
    ],
    penaltyKicks: [],
    bookings: [
      {
        cardType: "YELLOW",
        minute: 40,
        teamId: "t2",
        member: { id: "p2", fullName: "سالم ولد علي", photo: null },
      },
    ],
    mvpVote: null,
  };
}

function show(football: boolean) {
  rtlCleanup();
  render(
    <MatchResult
      match={match()}
      day={{ round: null, venue: null }}
      allMatches={[match()]}
      football={football}
      tournamentTitle="كأس"
      loggedIn={false}
      myVoteCandidateId={null}
    />,
  );
}

describe("MatchResult by sport profile", () => {
  it("tells the football story in full", () => {
    show(true);

    expect(screen.getAllByLabelText(/رجل المباراة/).length).toBeGreaterThan(0);
    expect(screen.getByText(/مجريات المباراة/)).toBeDefined();
  });

  it("keeps a yellow card off the card until the timeline is opened", () => {
    show(true);

    expect(screen.queryByText(/سالم ولد علي/)).toBeNull();
    fireEvent.click(screen.getByText(/مجريات المباراة/));
    expect(screen.getByText(/سالم ولد علي/)).toBeDefined();
  });

  it("keeps a board result to the score alone", () => {
    show(false);

    expect(screen.queryByLabelText(/رجل المباراة/)).toBeNull();
    expect(screen.queryByText(/سالم ولد علي/)).toBeNull();
    expect(screen.queryByText(/مجريات المباراة/)).toBeNull();
    expect(screen.getAllByText(/الصقور/).length).toBeGreaterThan(0);
  });
});
