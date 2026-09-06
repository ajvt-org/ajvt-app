import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Scoreline from "./Scoreline";
import MatchResult from "./MatchResult";
import type { DecidedMatch } from "./publicTypes";

const MATCH: DecidedMatch = {
  id: "m1",
  firstTeam: { id: "t1", name: "الصقور", logo: null },
  secondTeam: { id: "t2", name: "النسور", logo: null },
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
  forfeitWinnerTeamId: null,
  manOfTheMatch: null,
  goals: [],
  penaltyKicks: [],
  bookings: [],
  parts: [],
  adjustments: [],
  series: null,
  mvpVote: null,
};

describe("Scoreline", () => {
  it("emits the home number first, in a right to left box", () => {
    render(
      <span data-testid="score">
        <Scoreline home={3} away={1} />
      </span>,
    );

    const line = screen.getByTestId("score").firstElementChild!;
    expect(line.getAttribute("dir")).toBe("rtl");
    expect([...line.children].map((c) => c.textContent)).toEqual(["3", "-", "1"]);
  });

  it("carries a shootout the same way round", () => {
    render(
      <span data-testid="kicks">
        <Scoreline home={4} away={2} />
      </span>,
    );

    const line = screen.getByTestId("kicks").firstElementChild!;
    expect([...line.children].map((c) => c.textContent)).toEqual(["4", "-", "2"]);
  });
});

describe("a played match", () => {
  it("shows its score through Scoreline, not a left to right run", () => {
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
