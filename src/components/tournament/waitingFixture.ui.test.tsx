import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import MatchFixture from "./MatchFixture";
import TodayBand from "./TodayBand";
import { publicTournament } from "@/lib/texts";
import type { PublicMatch } from "./publicTypes";

const WAITING: PublicMatch = {
  id: "m1",
  homeTeam: null,
  awayTeam: null,
  matchDate: new Date("2026-09-27T17:00:00.000Z"),
  round: "نصف النهائي",
  venue: "الملعب البلدي",
  isKnockout: true,
  bracketRound: 1,
  order: 13,
  homeScore: null,
  awayScore: null,
  homePenalties: null,
  awayPenalties: null,
  status: "SCHEDULED",
  forfeitWinnerTeamId: null,
  manOfTheMatch: null,
  goals: [],
  penaltyKicks: [],
  bookings: [],
  mvpVote: null,
};

const DAY = { round: null, venue: null };

afterEach(cleanup);

describe("a fixture whose teams are not known yet", () => {
  it("shows both sides as decided later in the upcoming list", () => {
    render(<MatchFixture match={WAITING} day={DAY} />);

    expect(screen.getAllByText(publicTournament.teamDecidedLater)).toHaveLength(2);
  });

  it("shows a known side by name and the other as decided later", () => {
    render(
      <MatchFixture
        match={{ ...WAITING, homeTeam: { id: "t1", name: "الصقور", logo: null } }}
        day={DAY}
      />,
    );

    expect(screen.getByText("الصقور")).toBeDefined();
    expect(screen.getAllByText(publicTournament.teamDecidedLater)).toHaveLength(1);
  });

  it("shows both sides as decided later in today's band", () => {
    render(<TodayBand matches={[WAITING]} />);

    expect(screen.getAllByText(publicTournament.teamDecidedLater)).toHaveLength(2);
  });
});
