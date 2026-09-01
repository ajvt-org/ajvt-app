import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import GoalSection from "./GoalSection";
import type { GoalDraft } from "./goalDraft";
import { matchAdmin as texts } from "@/lib/texts";

const SIDES = [
  { id: "t1", name: "الأول" },
  { id: "t2", name: "الثاني" },
];

const ROSTER = [
  { id: "p1", fullName: "أحمد" },
  { id: "p2", fullName: "سالم" },
];

const GOAL: GoalDraft = {
  teamId: "t1",
  userId: "p1",
  kind: "GOAL",
  period: "REGULAR",
  minute: "12",
};

function Harness({
  initial,
  onGoals,
}: {
  initial: GoalDraft[];
  onGoals: (g: GoalDraft[]) => void;
}) {
  const [goals, setGoals] = useState<GoalDraft[]>(initial);
  return (
    <GoalSection
      title="الأهداف"
      period="REGULAR"
      goals={goals}
      setGoals={(next) => {
        setGoals((prev) => {
          const value = typeof next === "function" ? next(prev) : next;
          onGoals(value);
          return value;
        });
      }}
      sides={SIDES}
      scorerRoster={() => ROSTER}
      nameOf={(id) => ROSTER.find((m) => m.id === id)?.fullName ?? texts.unknownScorer}
    />
  );
}

function setup(initial: GoalDraft[] = [GOAL]) {
  const onGoals = vi.fn();
  render(<Harness initial={initial} onGoals={onGoals} />);
  return onGoals;
}

describe("fixing a goal that was entered wrong", () => {
  it("offers an edit next to every goal", () => {
    setup();

    expect(screen.getByLabelText(texts.edit)).toBeDefined();
  });

  it("loads the goal into the form when editing starts", async () => {
    setup();

    await userEvent.click(screen.getByLabelText(texts.edit));

    expect(screen.getByText(texts.editingGoal)).toBeDefined();
    expect(screen.getByLabelText(texts.fieldMinute)).toHaveProperty("value", "12");
  });

  it("replaces the goal rather than adding a second one", async () => {
    const onGoals = setup();

    await userEvent.click(screen.getByLabelText(texts.edit));
    const minute = screen.getByLabelText(texts.fieldMinute);
    await userEvent.clear(minute);
    await userEvent.type(minute, "34");
    await userEvent.click(screen.getByText(texts.saveEdit));

    expect(onGoals).toHaveBeenLastCalledWith([{ ...GOAL, minute: "34" }]);
  });

  it("leaves the goal alone when the edit is cancelled", async () => {
    const onGoals = setup();

    await userEvent.click(screen.getByLabelText(texts.edit));
    await userEvent.click(screen.getByText(texts.cancelEdit));

    expect(onGoals).not.toHaveBeenCalled();
    expect(screen.queryByText(texts.editingGoal)).toBeNull();
  });

  it("goes back to adding once an edit is saved", async () => {
    setup();

    await userEvent.click(screen.getByLabelText(texts.edit));
    await userEvent.click(screen.getByText(texts.saveEdit));

    expect(screen.getByText(texts.addGoal)).toBeDefined();
    expect(screen.queryByText(texts.editingGoal)).toBeNull();
  });

  it("still adds a new goal, leaving the existing one in place", async () => {
    const onGoals = setup();

    await userEvent.type(screen.getByLabelText(texts.fieldMinute), "70");
    await userEvent.click(screen.getByText(texts.addGoal));

    expect(onGoals).toHaveBeenLastCalledWith([
      GOAL,
      { teamId: "t1", userId: null, kind: "GOAL", period: "REGULAR", minute: "70" },
    ]);
  });

  it("removes a goal and closes any edit open on it", async () => {
    const onGoals = setup();

    await userEvent.click(screen.getByLabelText(texts.edit));
    await userEvent.click(screen.getByLabelText(texts.remove));

    expect(onGoals).toHaveBeenLastCalledWith([]);
    expect(screen.queryByText(texts.editingGoal)).toBeNull();
  });
});
