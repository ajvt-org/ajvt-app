import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ForfeitToggle from "./ForfeitToggle";
import { matchAdmin as texts } from "@/lib/texts";

const SIDES = [
  { id: "home", name: "الفريق الأول" },
  { id: "away", name: "الفريق الثاني" },
];

function setup(winnerTeamId: string | null, scored = { home: 1, away: 2 }, extraGoals = "0") {
  const onChange = vi.fn();
  const onExtraGoalsChange = vi.fn();
  render(
    <ForfeitToggle
      sides={SIDES}
      homeTeamId="home"
      scored={scored}
      winnerTeamId={winnerTeamId}
      extraGoals={extraGoals}
      onChange={onChange}
      onExtraGoalsChange={onExtraGoalsChange}
    />,
  );
  return { onChange, onExtraGoalsChange };
}

describe("the forfeit switch", () => {
  it("is off, and offers no winner, for a match that was played out", () => {
    setup(null);

    expect(screen.getByRole("switch")).toHaveProperty("ariaChecked", "false");
    expect(screen.queryByText(texts.forfeitPickWinner)).toBeNull();
  });

  it("picks the first side when switched on, so a winner is always set", async () => {
    const { onChange } = setup(null);

    await userEvent.click(screen.getByRole("switch"));

    expect(onChange).toHaveBeenCalledWith("home");
  });

  it("clears the forfeit when switched off", async () => {
    const { onChange } = setup("home");

    await userEvent.click(screen.getByRole("switch"));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("marks the winning side and lets the other be chosen", async () => {
    const { onChange } = setup("home");

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
});

describe("the goals awarded for the table", () => {
  it("offers nothing to award on a match that was played out", () => {
    setup(null);

    expect(screen.queryByLabelText(texts.forfeitExtraLabel)).toBeNull();
    expect(screen.queryByText(texts.forfeitExtraHint)).toBeNull();
  });

  it("shows the award the match already carries", () => {
    setup("home", { home: 1, away: 2 }, "2");

    expect(screen.getByLabelText(texts.forfeitExtraLabel)).toHaveProperty("value", "2");
  });

  it("says that the award stays out of the score on the card", () => {
    setup("home");

    expect(screen.getByText(texts.forfeitExtraHint)).toBeTruthy();
  });

  it("hands the typed award back", async () => {
    const { onExtraGoalsChange } = setup("home", { home: 1, away: 2 }, "");

    await userEvent.type(screen.getByLabelText(texts.forfeitExtraLabel), "3");

    expect(onExtraGoalsChange).toHaveBeenCalledWith("3");
  });

  it("leaves the awarded score alone whatever is awarded", () => {
    setup("home", { home: 1, away: 2 }, "4");

    expect(screen.getByText(texts.forfeitAwarded).textContent).toContain("3");
  });
});
