import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MatchResult from "./MatchResult";
import Scoreline from "./Scoreline";
import type { DecidedMatch } from "./publicTypes";
import { CHESS_CONFIG } from "@tests/ui/ladders";

vi.mock("./MvpVoteWidget", () => ({ default: () => null }));

const MATCH: DecidedMatch = {
  id: "m1",
  firstTeam: { id: "t1", name: "أحمد", logo: null },
  secondTeam: { id: "t2", name: "سالم", logo: null },
  matchDate: new Date("2026-09-20T16:00:00.000Z"),
  round: "الدور الأول",
  venue: null,
  isKnockout: false,
  bracketRound: null,
  order: 0,
  homeScore: null,
  awayScore: null,
  homePenalties: null,
  awayPenalties: null,
  status: "PLAYED",
  forfeitWinnerTeamId: null,
  manOfTheMatch: null,
  goals: [],
  penaltyKicks: [],
  bookings: [],
  units: [
    {
      id: "p1",
      levelId: "unit",
      order: 1,
      abandoned: false,
      outcome: "SIDE_A",
      sideAPoints: null,
      sideBPoints: null,
      sideAColour: "FIRST",
      worth: null,
      worthRuleId: null,
      worthKept: true,
      sideALostCredit: false,
      sideBLostCredit: false,
      decider: false,
      endedBy: null,
      children: [],
      standing: null,
    },
    {
      id: "p2",
      levelId: "unit",
      order: 2,
      abandoned: false,
      outcome: "DRAW",
      sideAPoints: null,
      sideBPoints: null,
      sideAColour: "SECOND",
      worth: null,
      worthRuleId: null,
      worthKept: true,
      sideALostCredit: false,
      sideBLostCredit: false,
      decider: false,
      endedBy: null,
      children: [],
      standing: null,
    },
  ],
  moves: [],
  series: {
    sideATotal: 3,
    sideBTotal: 1,
    sideAAtClose: 0,
    sideBAtClose: 0,
    sideALostCredit: false,
    sideBLostCredit: false,
    scored: false,
    perUnit: 2,
    unitsRecorded: 2,
    unitsScored: 2,
    unitsLeft: 0,
    unitsAllowed: 2,
    target: null,
    over: true,
    level: false,
    unsettled: false,
    extending: false,
    winner: "SIDE_A",
  },
  mvpVote: null,
};

function show(match: DecidedMatch = MATCH) {
  return render(
    <MatchResult
      match={match}
      day={{ round: null, venue: null }}
      allMatches={[match]}
      football={false}
      levels={CHESS_CONFIG.ladder}
      showScorersAndCards={false}
      loggedIn={false}
      entrant="player"
      manOfTheMatchTeam={null}
      myVoteCandidateId={null}
    />,
  );
}

describe("a series result on the public card", () => {
  it("shows the total the parts came to", () => {
    const { container } = show();

    expect(container.textContent).toContain("1½");
  });

  it("shows every part rather than only the total", () => {
    show();

    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getAllByText("½").length).toBeGreaterThan(0);
  });

  it("says a match still being played is not finished", () => {
    show({
      ...MATCH,
      series: { ...MATCH.series!, over: false, unitsLeft: 1, winner: null },
    });

    expect(screen.getByText("قيد اللعب")).toBeDefined();
  });

  it("keeps the football score off a series card", () => {
    const { container } = show();

    expect(container.textContent).not.toContain("0-0");
  });
});

describe("the scoreline", () => {
  it("reads each side left to right, so a minus sign keeps its place", () => {
    const { container } = render(<Scoreline home="−1" away="2" />);

    const sides = container.querySelectorAll("bdi");
    expect(sides).toHaveLength(2);
    expect(sides[0].getAttribute("dir")).toBe("ltr");
    expect(sides[0].textContent).toBe("−1");
  });
});
