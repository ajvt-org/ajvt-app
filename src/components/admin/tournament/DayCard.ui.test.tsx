import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
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
  firstTeam: { id: "t1", name: "النجم" },
  secondTeam: { id: "t2", name: "الوحدة" },
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
  it("lifts the ground to the day heading when every match is played on it", () => {
    show(day({ matches: [match(), match({ id: "m2" })] }));

    const venue = screen.getByText("ملعب القرية");

    expect(venue.closest(".match-day-head")).not.toBeNull();
    expect(venue.closest("li")).toBeNull();
  });

  it("keeps a ground on the row where that match is played somewhere else", () => {
    show(day({ matches: [match(), match({ id: "m2", venue: "ملعب المدرسة" })] }));

    expect(screen.getByText("ملعب القرية").closest("li")).not.toBeNull();
    expect(screen.getByText("ملعب المدرسة").closest("li")).not.toBeNull();
    expect(screen.queryByText("ملعب القرية")!.closest(".match-day-head")).toBeNull();
  });

  it("leaves the ground on the row when a match on the day has none", () => {
    show(day({ matches: [match(), match({ id: "m2", venue: null })] }));

    expect(screen.getByText("ملعب القرية").closest("li")).not.toBeNull();
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

  it("still shows the rest toggle and the delete, disabled, once matches are on it", () => {
    show(day({ matches: [match()] }));

    expect(screen.getByText(texts.makeRestDay).closest("button")!.disabled).toBe(true);
    expect(screen.getByText(texts.removeDay).closest("button")!.disabled).toBe(true);
  });

  it("says on the card why neither will take a tap", () => {
    show(day({ matches: [match()] }));

    expect(screen.getByText(texts.dayLocked)).toBeDefined();
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

    expect(screen.getByText(texts.makeMatchDay)).toBeDefined();
    expect(screen.queryByText(texts.makeRestDay)).toBeNull();
  });

  it("leaves both controls live on an empty day, and says nothing about a lock", () => {
    show(day());

    expect(screen.getByText(texts.makeRestDay).closest("button")!.disabled).toBe(false);
    expect(screen.getByText(texts.removeDay).closest("button")!.disabled).toBe(false);
    expect(screen.queryByText(texts.dayLocked)).toBeNull();
  });

  it("leaves a rest day nothing to read but its own treatment", () => {
    const { container } = show(day({ isRest: true, position: 2 }));

    expect(container.textContent).not.toContain("يوم راحة");
  });
});

describe("the heading of a day", () => {
  it("says the date once and the number once", () => {
    show(day({ position: 3, date: "2026-08-26T00:00:00.000Z" }));

    expect(screen.getByText(/الأربعاء/).className).toContain("font-black");
    expect(screen.queryByText(texts.dayNumber(3))).toBeNull();
    expect(screen.getAllByText("3")).toHaveLength(1);
  });

  it("shows the badge alone when the day has no date", () => {
    show(day({ position: 3, date: null }));

    expect(screen.queryByText(texts.dayNumber(3))).toBeNull();
    expect(screen.getAllByText("3")).toHaveLength(1);
  });

  it("sets the heading apart from what the day holds", () => {
    show(day({ matches: [match()] }));

    const head = screen.getByText("1").closest(".match-day-head")!;

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

describe("the time a match is played at", () => {
  const retime = vi.fn();

  beforeEach(() => retime.mockClear());

  const showRetimable = (row: TournamentDayRow) =>
    render(<DayCard day={row} busy={false} onSetRest={noop} onRemove={noop} onRetime={retime} />);

  it("reads as a time rather than as a field waiting to be filled", () => {
    showRetimable(day({ matches: [match()] }));

    expect(screen.getByText("16:00")).toBeDefined();
    expect(screen.queryByLabelText(texts.matchTime)).toBeNull();
  });

  it("opens a field only when the time is reached for", () => {
    showRetimable(day({ matches: [match()] }));

    fireEvent.click(screen.getByLabelText(texts.changeTime));

    expect(screen.getByLabelText(texts.matchTime)).toBeDefined();
  });

  it("saves a time that changed and closes the field", () => {
    showRetimable(day({ matches: [match()] }));
    fireEvent.click(screen.getByLabelText(texts.changeTime));

    const field = screen.getByLabelText(texts.matchTime);
    fireEvent.change(field, { target: { value: "18:45" } });
    fireEvent.blur(field);

    expect(retime).toHaveBeenCalledWith("m1", "18:45");
    expect(screen.queryByLabelText(texts.matchTime)).toBeNull();
  });

  it("leaves the match alone when the time comes back unchanged", () => {
    showRetimable(day({ matches: [match()] }));
    fireEvent.click(screen.getByLabelText(texts.changeTime));

    fireEvent.blur(screen.getByLabelText(texts.matchTime));

    expect(retime).not.toHaveBeenCalled();
  });

  it("says a match has no time rather than showing an empty field", () => {
    showRetimable(day({ matches: [match({ matchDate: null })] }));

    expect(screen.getByText(texts.noTime)).toBeDefined();
  });
});

describe("what a day card does with the width it takes", () => {
  it("lays the time, the fixture and the result across the row", () => {
    show(day({ matches: [match({ status: "PLAYED", homeScore: 1, awayScore: 0 })] }));

    const row = fixtureRow();

    expect(row.className).toContain("sm:grid-cols-[auto_1fr_auto]");
    expect(row.children.length).toBe(3);
  });

  it("carries the round the match belongs to on the row", () => {
    show(day({ matches: [match({ round: "الجولة الأولى" })] }));

    expect(screen.getByText("الجولة الأولى").closest("li")).not.toBeNull();
  });

  it("holds every match of the day in the order it was given", () => {
    show(
      day({
        matches: [match(), match({ id: "m2", firstTeam: { id: "t3", name: "الأمل" } })],
      }),
    );

    const rows = [...document.querySelectorAll("li")].map((row) => row.textContent);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain("النجم");
    expect(rows[1]).toContain("الأمل");
  });

  it("warns on the day when a team is booked twice on it", () => {
    show(
      day({
        matches: [match(), match({ id: "m2", secondTeam: { id: "t1", name: "النجم" } })],
      }),
    );

    expect(screen.getByText(texts.doubleBooked("النجم"))).toBeDefined();
  });
});
