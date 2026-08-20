import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuizPicker from "./QuizPicker";
import type { RunningCompetition } from "./types";

const rows: RunningCompetition[] = [
  {
    id: "c1",
    name: "مسابقة الصيف",
    visibility: "PUBLIC",
    roundCount: 30,
    startsAt: "2026-08-20T08:00:00.000Z",
    state: "open",
    playedRounds: 2,
    myScore: 40,
  },
  {
    id: "c2",
    name: "مسابقة البدريين",
    visibility: "PRIVATE",
    roundCount: 7,
    startsAt: "2026-08-20T08:00:00.000Z",
    state: "closed",
    playedRounds: 0,
    myScore: 0,
  },
];

describe("QuizPicker", () => {
  it("shows every competition the member may play", () => {
    render(<QuizPicker competitions={rows} backHref="/home" onPick={() => {}} />);

    expect(screen.getByText("مسابقة الصيف")).toBeDefined();
    expect(screen.getByText("مسابقة البدريين")).toBeDefined();
  });

  it("says how far the member is through each one", () => {
    render(<QuizPicker competitions={rows} backHref="/home" onPick={() => {}} />);

    expect(screen.getByText(/2 من 30 جولة/)).toBeDefined();
    expect(screen.getByText(/0 من 7 جولات/)).toBeDefined();
  });

  it("hands back the one that was picked", async () => {
    const onPick = vi.fn();
    render(<QuizPicker competitions={rows} backHref="/home" onPick={onPick} />);

    await userEvent.click(screen.getByText("مسابقة البدريين"));

    expect(onPick).toHaveBeenCalledWith("c2");
  });

  it("keeps a finished competition open to look at", async () => {
    const onPick = vi.fn();
    render(
      <QuizPicker
        competitions={[{ ...rows[0], state: "over" }]}
        backHref="/home"
        onPick={onPick}
      />,
    );

    await userEvent.click(screen.getByText("مسابقة الصيف"));

    expect(onPick).toHaveBeenCalledWith("c1");
  });

  it("keeps one that has not started shut", async () => {
    const onPick = vi.fn();
    render(
      <QuizPicker
        competitions={[{ ...rows[0], state: "before" }]}
        backHref="/home"
        onPick={onPick}
      />,
    );

    await userEvent.click(screen.getByText("مسابقة الصيف"));

    expect(onPick).not.toHaveBeenCalled();
  });
});
