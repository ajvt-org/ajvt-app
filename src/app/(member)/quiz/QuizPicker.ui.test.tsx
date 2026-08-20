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
    passedRounds: 2,
    myScore: 40,
  },
  {
    id: "c2",
    name: "مسابقة البدريين",
    visibility: "PRIVATE",
    roundCount: 7,
    startsAt: "2026-08-20T08:00:00.000Z",
    state: "closed",
    passedRounds: 0,
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

  it("wears each competition's state as a chip", () => {
    render(<QuizPicker competitions={rows} backHref="/home" onPick={() => {}} />);

    expect(screen.getByText("جولة مفتوحة الآن")).toBeDefined();
    expect(screen.getByText("بين جولتين")).toBeDefined();
  });

  it("shows the member's score on a playable competition", () => {
    render(<QuizPicker competitions={rows} backHref="/home" onPick={() => {}} />);

    expect(screen.getByText("40")).toBeDefined();
  });

  it("hides the score of one that has not started", () => {
    render(
      <QuizPicker
        competitions={[{ ...rows[0], state: "before" }]}
        backHref="/home"
        onPick={() => {}}
      />,
    );

    expect(screen.queryByText("40")).toBeNull();
  });

  it("hands back the one that was picked", async () => {
    const onPick = vi.fn();
    render(<QuizPicker competitions={rows} backHref="/home" onPick={onPick} />);

    await userEvent.click(screen.getByText("مسابقة البدريين"));

    expect(onPick).toHaveBeenCalledWith("c2");
  });

  it("offers the tutorial as its own card with a clear start", async () => {
    const onTutorial = vi.fn();
    render(
      <QuizPicker competitions={rows} backHref="/home" onPick={() => {}} onTutorial={onTutorial} />,
    );

    expect(screen.getByText("تعلّم اللعب في دقيقة")).toBeDefined();

    await userEvent.click(screen.getByRole("button", { name: /ابدأ الجولة التجريبية/ }));

    expect(onTutorial).toHaveBeenCalled();
  });

  it("fences the tutorial behind its own separator", () => {
    render(
      <QuizPicker competitions={rows} backHref="/home" onPick={() => {}} onTutorial={() => {}} />,
    );

    expect(screen.getByText("ركن التجربة")).toBeDefined();
  });

  it("keeps the separator out when there is no tutorial", () => {
    render(<QuizPicker competitions={rows} backHref="/home" onPick={() => {}} />);

    expect(screen.queryByText("ركن التجربة")).toBeNull();
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

  it("counts down to the start of one that has not begun", () => {
    const soon = new Date(Date.now() + 90_000).toISOString();
    render(
      <QuizPicker
        competitions={[{ ...rows[0], state: "before", startsAt: soon, passedRounds: 0 }]}
        backHref="/home"
        onPick={() => {}}
      />,
    );

    expect(screen.getByText("تنطلق بعد")).toBeDefined();
    expect(screen.getByLabelText("الوقت المتبقي لانطلاق المسابقة").textContent).toMatch(
      /00:01:\d\d/,
    );
    expect(screen.queryByText(/من 30 جولة/)).toBeNull();
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
