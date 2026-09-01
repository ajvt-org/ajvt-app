import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BracketTree from "./BracketTree";
import { publicTournament as texts } from "@/lib/texts";

const SEMI = {
  id: "m1",
  bracketRound: 1,
  order: 1,
  round: "نصف النهائي",
  homeTeam: { id: "t1", name: "الصقور", logo: null },
  awayTeam: { id: "t2", name: "النسور", logo: null },
  homeScore: 2,
  awayScore: 1,
  homePenalties: null,
  awayPenalties: null,
  status: "PLAYED" as const,
};

const FINAL = {
  id: "m2",
  bracketRound: 2,
  order: 1,
  round: "النهائي",
  homeTeam: null,
  awayTeam: null,
  homeScore: null,
  awayScore: null,
  homePenalties: null,
  awayPenalties: null,
  status: "SCHEDULED" as const,
};

describe("BracketTree", () => {
  it("names both teams of a match that has been drawn", () => {
    render(<BracketTree matches={[SEMI]} />);

    expect(screen.getByText("الصقور")).toBeTruthy();
    expect(screen.getByText("النسور")).toBeTruthy();
  });

  it("says a side is still to be decided rather than naming where it comes from", () => {
    render(<BracketTree matches={[FINAL]} />);

    expect(screen.getAllByText(texts.teamDecidedLater)).toHaveLength(2);
    expect(screen.queryByText(/نصف النهائي/)).toBeNull();
  });

  it("shows the round a fixture with no teams belongs to", () => {
    render(<BracketTree matches={[SEMI, FINAL]} />);

    expect(screen.getByText("النهائي")).toBeTruthy();
    expect(screen.getAllByText(texts.teamDecidedLater)).toHaveLength(2);
  });

  it("carries no score on a fixture with no teams", () => {
    render(<BracketTree matches={[FINAL]} />);

    expect(screen.queryByText("0")).toBeNull();
  });

  it("draws nothing at all when the bracket is empty", () => {
    const { container } = render(<BracketTree matches={[]} />);

    expect(container.firstChild).toBeNull();
  });
});
