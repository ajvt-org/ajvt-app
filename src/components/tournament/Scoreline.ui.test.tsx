import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Scoreline from "./Scoreline";
import MatchResult from "./MatchResult";
import type { PublicMatch } from "./publicTypes";

const MATCH: PublicMatch = {
  id: "m1",
  homeTeam: { id: "t1", name: "الصقور", logo: null },
  awayTeam: { id: "t2", name: "النسور", logo: null },
  matchDate: new Date("2026-08-20T16:00:00.000Z"),
  round: null,
  venue: null,
  isKnockout: false,
  bracketRound: null,
  order: 0,
  homeScore: 0,
  awayScore: 1,
  homePenalties: null,
  awayPenalties: null,
  status: "PLAYED",
  manOfTheMatch: null,
  goals: [],
  penaltyKicks: [],
  bookings: [],
  mvpVote: null,
};

describe("Scoreline", () => {
  it("puts the home number on the right-to-left start, beside the home team", () => {
    render(
      <span data-testid="score">
        <Scoreline home={3} away={1} />
      </span>,
    );

    const line = screen.getByTestId("score").firstElementChild!;
    expect(line.getAttribute("dir")).toBe("rtl");
    expect([...line.children].map((c) => c.textContent)).toEqual(["3", "-", "1"]);
  });

  it("is what a played match shows, rather than a left-to-right run that swaps the sides", () => {
    const { container } = render(
      <MatchResult
        match={MATCH}
        day={{ round: null, venue: null }}
        allMatches={[MATCH]}
        tournamentTitle="كأس"
        loggedIn={false}
        myVoteCandidateId={null}
      />,
    );

    const score = [...container.querySelectorAll("span")].find((el) => el.textContent === "0-1");
    expect(score?.getAttribute("dir")).toBe("rtl");
  });
});
