import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DayCard from "./DayCard";
import { daysTab as texts } from "@/lib/texts";
import type { DayMatch, TournamentDayRow } from "./daysTypes";

const noop = vi.fn();

const match = (over: Partial<DayMatch> = {}): DayMatch => ({
  id: "m1",
  matchDate: "2026-08-24T16:00:00.000Z",
  round: null,
  venue: "ملعب القرية",
  status: "SCHEDULED",
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

describe("a day that holds matches", () => {
  it("keeps the venue with the fixture rather than beside the time input", () => {
    show(day({ matches: [match()] }));

    const time = screen.getByLabelText(texts.matchTime);
    const venue = screen.getByText("ملعب القرية");

    expect(time.parentElement).not.toBe(venue.parentElement);
    expect(venue.closest("li")?.contains(time)).toBe(true);
    expect(venue.closest("div")?.textContent).toContain("النجم");
  });

  it("keeps the finished badge with the fixture too", () => {
    show(day({ matches: [match({ status: "PLAYED" })] }));

    const badge = screen.getByText(texts.finished);
    expect(badge.closest("div")?.textContent).toContain("النجم");
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
