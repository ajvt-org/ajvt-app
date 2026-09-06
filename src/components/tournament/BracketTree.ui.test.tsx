import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BracketTree from "./BracketTree";
import { CARD_HEIGHT } from "@/lib/bracketLayout";
import { bracketRoundLabel } from "@/lib/tournament";
import { publicTournament as texts } from "@/lib/texts";

const SEMI = {
  id: "m1",
  bracketRound: 1,
  order: 1,
  round: "نصف النهائي",
  firstTeam: { id: "t1", name: "الصقور", logo: null },
  secondTeam: { id: "t2", name: "النسور", logo: null },
  homeScore: 2,
  awayScore: 1,
  homePenalties: null,
  awayPenalties: null,
  status: "PLAYED" as const,
};

const BYE = {
  id: "m3",
  bracketRound: 1,
  order: 2,
  round: "نصف النهائي",
  firstTeam: { id: "t3", name: "الأبطال", logo: null },
  secondTeam: null,
  homeScore: null,
  awayScore: null,
  homePenalties: null,
  awayPenalties: null,
  status: "PLAYED" as const,
};

const FINAL = {
  id: "m2",
  bracketRound: 2,
  order: 1,
  round: "النهائي",
  firstTeam: null,
  secondTeam: null,
  homeScore: null,
  awayScore: null,
  homePenalties: null,
  awayPenalties: null,
  status: "SCHEDULED" as const,
};

describe("BracketTree", () => {
  it("calls an empty side of a played slot a bye rather than undecided", () => {
    render(<BracketTree matches={[BYE]} />);

    expect(screen.getByText(texts.bye)).toBeTruthy();
    expect(screen.queryByText(texts.teamDecidedLater)).toBeNull();
  });

  it("carries no score on a bye", () => {
    const { container } = render(<BracketTree matches={[BYE]} />);

    expect(container.textContent).not.toContain("0");
  });

  it("draws a round that mixes a contest with a bye", () => {
    const { container } = render(<BracketTree matches={[SEMI, BYE, FINAL]} />);

    expect(screen.getByText("الأبطال")).toBeTruthy();
    expect(screen.getByText("الصقور")).toBeTruthy();
    expect(container.querySelectorAll(".absolute.inset-x-0")).toHaveLength(3);
  });

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

const bracketOf = (firstRoundCount: number) => {
  const matches = [];
  for (let round = 1, size = firstRoundCount; size >= 1; round++, size /= 2) {
    for (let order = 1; order <= size; order++) {
      matches.push({
        ...FINAL,
        id: `r${round}-${order}`,
        bracketRound: round,
        order,
        round: bracketRoundLabel(size),
      });
    }
  }
  return matches;
};

const columnsOf = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("p + div.relative"));

const cardTops = (column: Element) =>
  Array.from(column.querySelectorAll<HTMLElement>(":scope > div")).map((card) =>
    Number.parseFloat(card.style.top),
  );

describe("BracketTree, how the rounds are laid out", () => {
  it.each([2, 4, 8])("gives a first round of %i one column per round", (firstRoundCount) => {
    const { container } = render(<BracketTree matches={bracketOf(firstRoundCount)} />);

    expect(columnsOf(container)).toHaveLength(Math.log2(firstRoundCount) + 1);
  });

  it.each([2, 4, 8])("groups every fixture under the round it belongs to, from %i", (count) => {
    const { container } = render(<BracketTree matches={bracketOf(count)} />);

    expect(columnsOf(container).map((column) => cardTops(column).length)).toEqual(
      Array.from({ length: Math.log2(count) + 1 }, (_, round) => count / 2 ** round),
    );
  });

  it.each([2, 4, 8])("never lets two cards of a first round of %i overlap", (count) => {
    const { container } = render(<BracketTree matches={bracketOf(count)} />);
    const tops = cardTops(columnsOf(container)[0]);

    const gaps = tops.slice(1).map((top, index) => top - tops[index]);
    expect(gaps.every((gap) => gap > CARD_HEIGHT)).toBe(true);
    expect(new Set(gaps).size).toBe(1);
  });

  it.each([4, 8])("centres a fixture between the two that feed it, from %i", (count) => {
    const { container } = render(<BracketTree matches={bracketOf(count)} />);
    const [feeders, next] = columnsOf(container).map(cardTops);

    expect(next).toEqual(next.map((_, index) => (feeders[index * 2] + feeders[index * 2 + 1]) / 2));
  });

  it("draws a joining line into every round after the first, and none before it", () => {
    const { container } = render(<BracketTree matches={bracketOf(4)} />);
    const columns = columnsOf(container);

    expect(columns[0].querySelector(":scope > svg")).toBeNull();
    expect(columns[1].querySelectorAll(":scope > svg path")).toHaveLength(2);
    expect(columns[2].querySelectorAll(":scope > svg path")).toHaveLength(1);
  });

  it("names a round the fixtures do not label themselves", () => {
    render(<BracketTree matches={[{ ...FINAL, round: null, bracketRound: 3 }]} />);

    expect(screen.getByText(texts.bracketRound(3))).toBeTruthy();
  });
});
