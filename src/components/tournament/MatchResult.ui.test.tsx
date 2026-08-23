import { describe, it, expect } from "vitest";
import { render, screen, cleanup as rtlCleanup } from "@testing-library/react";
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
        member: { id: "p1", fullName: "أحمد ولد محمد", photo: null },
      },
    ],
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

    expect(screen.getByText(/رجل المباراة/)).toBeDefined();
    expect(screen.getAllByText(/سالم ولد علي/).length).toBeGreaterThan(0);
  });

  it("keeps a board result to the score alone", () => {
    show(false);

    expect(screen.queryByText(/رجل المباراة/)).toBeNull();
    expect(screen.queryByText(/سالم ولد علي/)).toBeNull();
    expect(screen.getAllByText(/الصقور/).length).toBeGreaterThan(0);
  });
});
