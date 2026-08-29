import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ForfeitToggle from "./ForfeitToggle";
import { matchAdmin as texts } from "@/lib/texts";

const SIDES = [
  { id: "home", name: "الفريق الأول" },
  { id: "away", name: "الفريق الثاني" },
];

function setup(winnerTeamId: string | null, scored = { home: 1, away: 2 }) {
  const onChange = vi.fn();
  render(
    <ForfeitToggle
      sides={SIDES}
      homeTeamId="home"
      scored={scored}
      winnerTeamId={winnerTeamId}
      onChange={onChange}
    />,
  );
  return onChange;
}

describe("the forfeit switch", () => {
  it("is off, and offers no winner, for a match that was played out", () => {
    setup(null);

    expect(screen.getByRole("switch")).toHaveProperty("ariaChecked", "false");
    expect(screen.queryByText(texts.forfeitPickWinner)).toBeNull();
  });

  it("explains what a forfeit does before it is switched on", () => {
    setup(null);

    expect(screen.getByText(texts.forfeitHint)).toBeDefined();
  });

  it("picks the first side when switched on, so a winner is always set", async () => {
    const onChange = setup(null);

    await userEvent.click(screen.getByRole("switch"));

    expect(onChange).toHaveBeenCalledWith("home");
  });

  it("clears the forfeit when switched off", async () => {
    const onChange = setup("home");

    await userEvent.click(screen.getByRole("switch"));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("marks the winning side and lets the other be chosen", async () => {
    const onChange = setup("home");

    expect(screen.getByRole("button", { pressed: true }).textContent).toContain("الفريق الأول");

    await userEvent.click(screen.getByRole("button", { name: /الفريق الثاني/ }));
    expect(onChange).toHaveBeenCalledWith("away");
  });

  it("shows the score that will be recorded, not the one on the pitch", () => {
    setup("home", { home: 1, away: 2 });

    expect(screen.getByText(texts.forfeitAwarded).textContent).toContain("3");
  });

  it("leaves a winner who already scored more than three at their own score", () => {
    setup("away", { home: 0, away: 5 });

    expect(screen.getByText(texts.forfeitAwarded).textContent).toContain("5");
  });

  it("says the loser's goals are kept for a reversal", () => {
    setup("home");

    expect(screen.getByText(texts.forfeitKeptGoals)).toBeDefined();
  });
});
