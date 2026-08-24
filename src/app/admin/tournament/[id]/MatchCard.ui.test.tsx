import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import MatchCard from "./MatchCard";
import type { Match } from "./types";

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

function show(profile: "FOOTBALL" | "BOARD", showResultForm = false) {
  cleanup();
  render(
    <MatchCard
      match={match()}
      teams={[]}
      allMatches={[match()]}
      profile={profile}
      suspendedIds={[]}
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
        profile="FOOTBALL"
        suspendedIds={[]}
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

describe("MatchCard by sport profile", () => {
  it("shows the whole football apparatus for a football match", () => {
    show("FOOTBALL");

    expect(screen.getByText(/رجل المباراة/)).toBeDefined();
    expect(screen.getByText(/أفضل لاعب/)).toBeDefined();
    expect(screen.getByText(/سالم/)).toBeDefined();
  });

  it("keeps a board match down to the result", () => {
    show("BOARD");

    expect(screen.queryByText(/رجل المباراة/)).toBeNull();
    expect(screen.queryByText(/أفضل لاعب/)).toBeNull();
    expect(screen.queryByText(/سالم/)).toBeNull();
    expect(screen.getByText(/تعديل التفاصيل/)).toBeDefined();
  });

  it("opens card entry with the result form on a football match", () => {
    show("FOOTBALL", true);

    expect(screen.getByText(/البطاقات/)).toBeDefined();
    expect(screen.getByText(/حفظ النتيجة/)).toBeDefined();
  });

  it("keeps card entry out of a board result form", () => {
    show("BOARD", true);

    expect(screen.queryByText(/البطاقات/)).toBeNull();
    expect(screen.getByText(/حفظ النتيجة/)).toBeDefined();
  });
});
