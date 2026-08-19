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
  },
  {
    id: "c2",
    name: "مسابقة البدريين",
    visibility: "PRIVATE",
    roundCount: 7,
    startsAt: "2026-08-20T08:00:00.000Z",
  },
];

describe("QuizPicker", () => {
  it("shows every competition the member may play", () => {
    render(<QuizPicker competitions={rows} backHref="/home" onPick={() => {}} />);

    expect(screen.getByText("مسابقة الصيف")).toBeDefined();
    expect(screen.getByText("مسابقة البدريين")).toBeDefined();
  });

  it("says how many rounds each one runs", () => {
    render(<QuizPicker competitions={rows} backHref="/home" onPick={() => {}} />);

    expect(screen.getByText("30 جولة")).toBeDefined();
    expect(screen.getByText("7 جولة")).toBeDefined();
  });

  it("hands back the one that was picked", async () => {
    const onPick = vi.fn();
    render(<QuizPicker competitions={rows} backHref="/home" onPick={onPick} />);

    await userEvent.click(screen.getByText("مسابقة البدريين"));

    expect(onPick).toHaveBeenCalledWith("c2");
  });
});
