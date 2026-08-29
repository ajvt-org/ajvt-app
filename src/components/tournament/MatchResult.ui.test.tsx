import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, cleanup as rtlCleanup } from "@testing-library/react";
import MatchResult from "./MatchResult";
import type { PublicMatch } from "./publicTypes";
import { matchDisplay } from "@/lib/texts";

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
    forfeitWinnerTeamId: null,
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

describe("a match won by forfeit", () => {
  function showForfeit(
    forfeitWinnerTeamId: string | null,
    over: { homePenalties?: number | null; awayPenalties?: number | null } = {},
  ) {
    rtlCleanup();
    render(
      <MatchResult
        match={{ ...match(), forfeitWinnerTeamId, homeScore: 3, awayScore: 0, ...over }}
        day={{ round: null, venue: null }}
        allMatches={[match()]}
        football
        tournamentTitle="كأس"
        loggedIn={false}
        myVoteCandidateId={null}
      />,
    );
  }

  it("says so, naming the side it was awarded to", () => {
    showForfeit("t1");

    expect(screen.getByText(matchDisplay.forfeitNote("الصقور"))).toBeDefined();
  });

  it("says nothing on a match that was played out", () => {
    showForfeit(null);

    expect(screen.queryByText(/انسحاب/)).toBeNull();
  });

  it("stops the shootout reading as the decider once a forfeit is awarded", () => {
    showForfeit("t1", { homePenalties: 4, awayPenalties: 3 });

    expect(screen.queryByText(matchDisplay.penalties)).toBeNull();
    expect(screen.getByText(matchDisplay.forfeitNote("الصقور"))).toBeDefined();
  });

  it("still shows the shootout on a match nobody forfeited", () => {
    showForfeit(null, { homePenalties: 4, awayPenalties: 3 });

    expect(screen.getByText(matchDisplay.penalties)).toBeDefined();
  });

  it("keeps the forfeiting side's goal out of the events", () => {
    showForfeit("t2");

    expect(screen.queryByText(/12/)).toBeNull();
  });

  it("still shows it when that side is the one awarded the win", () => {
    showForfeit("t1");

    expect(screen.getAllByText(/12/).length).toBeGreaterThan(0);
  });
});
