import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ElectionsList from "./ElectionsList";
import type { MemberElection } from "./electionTypes";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

function row(over: Partial<MemberElection>): MemberElection {
  return {
    id: "e1",
    title: "انتخاب اللجنة",
    startsAt: new Date(Date.now() + DAY).toISOString(),
    durationMinutes: 120,
    allowBlank: false,
    showResults: true,
    voted: false,
    _count: { candidates: 0 },
    ...over,
  };
}

function show(elections: MemberElection[]) {
  return render(<ElectionsList elections={elections} backHref="/home" onReached={vi.fn()} />);
}

const open = () =>
  row({
    id: "open",
    title: "التصويت الجاري",
    startsAt: new Date(Date.now() - HOUR).toISOString(),
    durationMinutes: 600,
  });

const upcoming = () => row({ id: "upcoming", title: "القادم" });

const ended = () =>
  row({
    id: "ended",
    title: "المنتهي",
    startsAt: new Date(Date.now() - 5 * DAY).toISOString(),
    durationMinutes: 60,
  });

describe("the elections a member reads", () => {
  it("says so when there is nothing to read", () => {
    show([]);

    expect(screen.getByText("لا توجد انتخابات حالياً")).toBeTruthy();
  });

  it("gives each of three elections its own state and its own clock", () => {
    show([open(), upcoming(), ended()]);

    expect(screen.getByText("جارٍ")).toBeTruthy();
    expect(screen.getByText("قادم")).toBeTruthy();
    expect(screen.getByText("منتهٍ")).toBeTruthy();
    expect(screen.getByLabelText("الوقت المتبقي لانتهاء التصويت")).toBeTruthy();
    expect(screen.getByLabelText("الوقت المتبقي لبداية التصويت")).toBeTruthy();
  });

  it("draws the rows in the order it was given", () => {
    const { container } = show([open(), upcoming(), ended()]);

    const titles = [...container.querySelectorAll(".activity-title")].map((el) => el.textContent);
    expect(titles).toEqual(["التصويت الجاري", "القادم", "المنتهي"]);
  });

  it("marks only the election this reader has voted in", () => {
    show([{ ...open(), voted: true }, upcoming()]);

    expect(screen.getAllByText("صوّتّ")).toHaveLength(1);
  });

  it("counts down to nothing once an election is over", () => {
    show([ended()]);

    expect(screen.queryByLabelText("الوقت المتبقي لانتهاء التصويت")).toBeNull();
    expect(screen.getByText(/انتهى التصويت في/)).toBeTruthy();
  });

  it("links each row to its own election", () => {
    show([open(), upcoming()]);

    const hrefs = screen
      .getAllByRole("link")
      .map((el) => el.getAttribute("href"))
      .filter((href) => href?.startsWith("/elections/"));

    expect(hrefs).toEqual([
      "/elections/open?from=%2Felections",
      "/elections/upcoming?from=%2Felections",
    ]);
  });
});
