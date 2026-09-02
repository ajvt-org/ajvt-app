import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import DayCard from "./DayCard";
import { daysTab as texts, matchDisplay } from "@/lib/texts";
import type { DayMatch, TournamentDayRow } from "./daysTypes";

const noop = vi.fn();

const match = (over: Partial<DayMatch> = {}): DayMatch => ({
  id: "m1",
  matchDate: "2026-08-24T16:00:00.000Z",
  round: null,
  venue: "ملعب القرية",
  status: "SCHEDULED",
  homeScore: null,
  awayScore: null,
  homePenalties: null,
  awayPenalties: null,
  forfeitWinnerTeamId: null,
  homeTeam: { id: "t1", name: "النجم" },
  awayTeam: { id: "t2", name: "الوحدة" },
  ...over,
});

const day = (over: Partial<TournamentDayRow> = {}): TournamentDayRow => ({
  id: "d1",
  position: 1,
  isRest: false,
  date: "2026-08-24T00:00:00.000Z",
  matches: [],
  ...over,
});

const show = (row: TournamentDayRow) =>
  render(<DayCard day={row} busy={false} onSetRest={noop} onRemove={noop} onRetime={noop} />);

const fixtureRow = () => screen.getByText(/النجم/).closest("li")!;

const scorelinesIn = (row: HTMLElement) =>
  [...row.querySelectorAll('[dir="rtl"]')].map((node) => node.textContent);

describe("a day that holds matches", () => {
  it("keeps the venue with the fixture rather than beside the time input", () => {
    show(day({ matches: [match()] }));

    const time = screen.getByLabelText(texts.matchTime);
    const venue = screen.getByText("ملعب القرية");

    expect(time.parentElement).not.toBe(venue.parentElement);
    expect(venue.closest("li")?.contains(time)).toBe(true);
    expect(venue.closest("div")?.textContent).toContain("النجم");
  });

  it("keeps the result with the fixture too", () => {
    show(day({ matches: [match({ status: "PLAYED", homeScore: 3, awayScore: 1 })] }));

    expect(scorelinesIn(fixtureRow())[0]).toBe("3-1");
    expect(fixtureRow().textContent).toContain("النجم");
  });

  it("says what a played match finished rather than only that it did", () => {
    show(day({ matches: [match({ status: "PLAYED", homeScore: 3, awayScore: 1 })] }));

    expect(scorelinesIn(fixtureRow())[0]).toBe("3-1");
    expect(screen.queryByText(texts.finished)).toBeNull();
  });

  it("names the shootout that settled a match", () => {
    show(
      day({
        matches: [
          match({
            status: "PLAYED",
            homeScore: 2,
            awayScore: 2,
            homePenalties: 4,
            awayPenalties: 3,
          }),
        ],
      }),
    );

    expect(screen.getByText(matchDisplay.penalties)).toBeDefined();
    expect(scorelinesIn(fixtureRow())).toEqual(["2-2", "4-3"]);
  });

  it("marks a walkover and keeps the awarded score", () => {
    show(
      day({
        matches: [
          match({ status: "PLAYED", homeScore: 3, awayScore: 0, forfeitWinnerTeamId: "t1" }),
        ],
      }),
    );

    expect(screen.getByText(matchDisplay.forfeitBadge)).toBeDefined();
    expect(scorelinesIn(fixtureRow())).toEqual(["3-0"]);
  });

  it("falls back to saying it finished when no score was saved", () => {
    show(day({ matches: [match({ status: "PLAYED" })] }));

    expect(screen.getByText(texts.finished)).toBeDefined();
  });

  it("offers neither the rest toggle nor the delete once matches are on it", () => {
    show(day({ matches: [match()] }));

    expect(screen.queryByText(texts.makeRestDay)).toBeNull();
    expect(screen.queryByText(texts.removeDay)).toBeNull();
  });
});

describe("a day that can still be changed", () => {
  it("sets the delete apart from the rest toggle", () => {
    show(day());

    const toggle = screen.getByText(texts.makeRestDay).closest("button")!;
    const remove = screen.getByText(texts.removeDay).closest("button")!;

    expect(remove.parentElement).not.toBe(toggle.parentElement);
    expect((remove.parentElement as HTMLElement).style.borderInlineStart).not.toBe("");
  });

  it("offers to make a rest day back into a match day", () => {
    show(day({ isRest: true }));

    expect(screen.getByText(texts.restDay)).toBeDefined();
    expect(screen.getByText(texts.makeMatchDay)).toBeDefined();
    expect(screen.queryByText(texts.makeRestDay)).toBeNull();
  });

  it("names the day and the date it falls on", () => {
    show(day({ position: 3 }));

    expect(screen.getByText(new RegExp(texts.dayNumber(3)))).toBeDefined();
  });
});

describe("the heading of a day", () => {
  it("leads with the date and keeps the day number under it", () => {
    show(day({ position: 3, date: "2026-08-26T00:00:00.000Z" }));

    const date = screen.getByText(/الأربعاء/);
    const number = screen.getByText(texts.dayNumber(3));

    expect(date.className).toContain("font-black");
    expect(date.nextElementSibling).toBe(number);
  });

  it("falls back to the day number when the day has no date", () => {
    show(day({ position: 3, date: null }));

    expect(screen.getAllByText(texts.dayNumber(3)).length).toBe(2);
  });

  it("sets the heading apart from what the day holds", () => {
    show(day({ matches: [match()] }));

    const head = screen.getByText(texts.dayNumber(1)).closest(".match-day-head")!;

    expect(head).not.toBeNull();
    expect(head.contains(screen.getByText(/النجم/))).toBe(false);
  });

  it("tells an ordinary day from a rest day at the number it carries", () => {
    show(day({ position: 2 }));
    const ordinary = screen.getByText("2").parentElement!.style.background;
    cleanup();

    show(day({ position: 2, isRest: true }));
    const rest = screen.getByText("2").parentElement!.style.background;

    expect(ordinary).not.toBe("");
    expect(ordinary).not.toBe(rest);
  });
});
