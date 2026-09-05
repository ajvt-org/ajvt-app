import { matchAdmin as texts } from "@/lib/texts";
import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import MatchCard from "./MatchCard";
import type { Match } from "./types";
import { publicTournament } from "@/lib/texts";

const noop = vi.fn();

function match(): Match {
  return {
    id: "m1",
    homeTeam: { id: "t1", name: "الصقور", logo: null },
    awayTeam: { id: "t2", name: "النسور", logo: null },
    matchDate: "2026-08-20T16:00:00.000Z",
    round: "النهائي",
    venue: "ملعب القرية",
    order: 0,
    isKnockout: true,
    bracketRound: 2,
    homeScore: 2,
    awayScore: 1,
    homePenalties: null,
    awayPenalties: null,
    manOfTheMatch: { id: "p1", fullName: "أحمد", photo: null },
    forfeitWinnerTeamId: null,
    status: "PLAYED",
    goals: [
      {
        id: "g1",
        count: 1,
        minute: 12,
        teamId: "t1",
        kind: "GOAL",
        period: "REGULAR",
        member: { id: "p1", fullName: "أحمد", photo: null },
      },
    ],
    penaltyKicks: [],
    bookings: [
      {
        id: "b1",
        cardType: "YELLOW",
        minute: 40,
        teamId: "t2",
        member: { id: "p2", fullName: "سالم", photo: null },
      },
    ],
    mvpVote: null,
  };
}

function show(matchShape: "FOOTBALL" | "SERIES", showResultForm = false) {
  cleanup();
  render(
    <MatchCard
      match={match()}
      teams={[]}
      allMatches={[match()]}
      matchShape={matchShape}
      suspendedIds={[]}
      mvpVoteMinutes={120}
      onDelete={noop}
      showResultForm={showResultForm}
      onToggleResultForm={noop}
      showMvp={false}
      onToggleMvp={noop}
      showDetails={false}
      onToggleDetails={noop}
      onSaved={noop}
      onChange={noop}
    />,
  );
}

describe("a team name carrying Latin letters", () => {
  it("keeps the score out of the name's own run", () => {
    cleanup();
    const { container } = render(
      <MatchCard
        match={{
          ...match(),
          homeTeam: { id: "t1", name: "كاستيا A", logo: null },
          awayTeam: { id: "t2", name: "اتحاد الجديدة B", logo: null },
          homeScore: 0,
          awayScore: 4,
        }}
        teams={[]}
        allMatches={[]}
        matchShape="FOOTBALL"
        suspendedIds={[]}
        mvpVoteMinutes={120}
        onDelete={noop}
        showResultForm={false}
        onToggleResultForm={noop}
        showMvp={false}
        onToggleMvp={noop}
        showDetails={false}
        onToggleDetails={noop}
        onSaved={noop}
        onChange={noop}
      />,
    );

    const names = [...container.querySelectorAll("bdi")].map((b) => b.textContent);
    expect(names).toContain("كاستيا A");
    expect(names).toContain("اتحاد الجديدة B");

    const score = [...container.querySelectorAll("span")].find((el) => el.textContent === "0-4");
    expect(score?.getAttribute("dir")).toBe("rtl");
  });
});

describe("a fixture whose teams are not known yet", () => {
  function waiting(over: Partial<Match> = {}) {
    cleanup();
    return render(
      <MatchCard
        match={{
          ...match(),
          homeTeam: null,
          awayTeam: null,
          status: "SCHEDULED",
          homeScore: null,
          awayScore: null,
          manOfTheMatch: null,
          goals: [],
          bookings: [],
          ...over,
        }}
        teams={[]}
        allMatches={[match()]}
        matchShape="FOOTBALL"
        suspendedIds={[]}
        mvpVoteMinutes={120}
        onDelete={noop}
        showResultForm
        onToggleResultForm={noop}
        showMvp
        onToggleMvp={noop}
        showDetails={false}
        onToggleDetails={noop}
        onSaved={noop}
        onChange={noop}
      />,
    );
  }

  it("names both sides as decided later", () => {
    const { container } = waiting();

    const names = [...container.querySelectorAll("bdi")].map((b) => b.textContent);
    expect(names).toEqual([publicTournament.teamDecidedLater, publicTournament.teamDecidedLater]);
  });

  it("offers nothing that needs two teams", () => {
    waiting();

    expect(screen.queryByText(texts.enterResult)).toBeNull();
    expect(screen.queryByText(texts.mvpVote)).toBeNull();
    expect(screen.queryByText(/مجريات المباراة/)).toBeNull();
    expect(screen.getByText(texts.editDetails)).toBeDefined();
  });

  it("keeps a prior meeting off a fixture with no teams to compare", () => {
    waiting();

    expect(screen.queryByText(texts.priorMeetings)).toBeNull();
  });
});

describe("MatchCard by sport matchShape", () => {
  it("shows the whole football apparatus for a football match", () => {
    show("FOOTBALL");

    expect(screen.getByLabelText(/رجل المباراة/)).toBeDefined();
    expect(screen.getByText(/أفضل لاعب/)).toBeDefined();
    expect(screen.getByText(/مجريات المباراة/)).toBeDefined();
  });

  it("keeps a yellow card off the card until the timeline is opened", () => {
    show("FOOTBALL");

    expect(screen.queryByText(/سالم/)).toBeNull();
    fireEvent.click(screen.getByText(/مجريات المباراة/));
    expect(screen.getByText(/سالم/)).toBeDefined();
  });

  it("keeps a series match down to the result", () => {
    show("SERIES");

    expect(screen.queryByLabelText(/رجل المباراة/)).toBeNull();
    expect(screen.queryByText(/أفضل لاعب/)).toBeNull();
    expect(screen.queryByText(/سالم/)).toBeNull();
    expect(screen.queryByText(/مجريات المباراة/)).toBeNull();
    expect(screen.getByText(/تعديل التفاصيل/)).toBeDefined();
  });

  it("opens card entry with the result form on a football match", () => {
    show("FOOTBALL", true);

    expect(screen.getByText(texts.addCard)).toBeDefined();
    expect(screen.getByText(/حفظ النتيجة/)).toBeDefined();
  });

  it("keeps card entry out of a series result form", () => {
    show("SERIES", true);

    expect(screen.queryByText(texts.addCard)).toBeNull();
    expect(screen.getByText(/حفظ النتيجة/)).toBeDefined();
  });
});
