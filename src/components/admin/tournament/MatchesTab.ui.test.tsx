import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import MatchesTab from "./MatchesTab";
import { matchAdmin as texts, setupWizard as wizardTexts } from "@/lib/texts";
import type { Match, Team } from "./types";

vi.mock("@/lib/api", () => ({
  api: { get: async () => null, post: async () => ({ ok: true }), del: async () => ({ ok: true }) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

vi.mock("@/components/Toast", () => ({ useToast: () => () => {} }));

const match = (over: Partial<Match> = {}): Match => ({
  id: "m",
  firstTeam: { id: "t1", name: "فريق 1", logo: null },
  secondTeam: { id: "t2", name: "فريق 2", logo: null },
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
  ...over,
});

const team = (id: string, name: string): Team => ({
  id,
  name,
  autoNamed: false,
  fromHomeVillage: true,
  logo: null,
  captainUserId: null,
  groupId: null,
  group: null,
  members: [],
});

const teams: Team[] = [team("t1", "فريق 1"), team("t2", "فريق 2")];

function show(matches: Match[]) {
  cleanup();
  render(
    <MatchesTab
      activityId="a1"
      teams={teams}
      groups={[]}
      format="KNOCKOUT"
      matchShape="FOOTBALL"
      series={null}
      entrant="team"
      matches={matches}
      suspendedIds={[]}
      mvpVoteMinutes={0}
      onChange={() => {}}
    />,
  );
}

const orderOf = (...labels: string[]) =>
  labels.map((label) => {
    const node = screen.getByText(label);
    return Array.from(document.querySelectorAll("*")).indexOf(node);
  });

const rises = (positions: number[]) => positions.every((at, i) => i === 0 || at > positions[i - 1]);

describe("the order of the competition tab", () => {
  beforeEach(() => cleanup());

  it("puts the three ways of making matches above the match lists", () => {
    show([match({ id: "s1" }), match({ id: "p1", status: "PLAYED" })]);

    const positions = orderOf(
      wizardTexts.open,
      texts.draw,
      texts.newMatch,
      texts.upcoming,
      texts.results,
    );

    expect(rises(positions)).toBe(true);
  });

  it("orders the actions by how much each of them does", () => {
    show([]);

    const positions = orderOf(wizardTexts.open, texts.draw, texts.newMatch);

    expect(rises(positions)).toBe(true);
  });

  it("does not make the one action that deletes the loudest button", () => {
    show([]);

    const setUp = screen.getByText(wizardTexts.open).closest("button");

    expect(setUp?.className).toContain("btn-ghost");
    expect(setUp?.className).not.toContain("btn-primary");
  });

  it("keeps the results below the fixtures still to play", () => {
    show([match({ id: "s1" }), match({ id: "p1", status: "PLAYED" })]);

    expect(rises(orderOf(texts.upcoming, texts.results))).toBe(true);
  });

  it("leaves out a list with nothing in it", () => {
    show([match({ id: "s1" })]);

    expect(screen.getByText(texts.upcoming)).toBeTruthy();
    expect(screen.queryByText(texts.results)).toBeNull();
  });

  it("offers no bracket at all with fewer than two entrants", () => {
    cleanup();
    render(
      <MatchesTab
        activityId="a1"
        teams={[teams[0]]}
        groups={[]}
        format="KNOCKOUT"
        matchShape="FOOTBALL"
        series={null}
        entrant="team"
        matches={[]}
        suspendedIds={[]}
        mvpVoteMinutes={0}
        onChange={() => {}}
      />,
    );

    expect(screen.queryByText(texts.draw)).toBeNull();
    expect(screen.getByText(wizardTexts.open)).toBeTruthy();
  });
});
