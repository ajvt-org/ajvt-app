import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ScoreBreakdown from "./ScoreBreakdown";
import type { AttemptDetailView } from "./types";

const detail: AttemptDetailView = {
  attemptId: "a1",
  round: 2,
  category: "جغرافيا",
  competitionName: "مسابقة الصيف",
  breakdown: {
    rows: [
      {
        position: 0,
        question: "ما عاصمة موريتانيا؟",
        category: "جغرافيا",
        maxPoints: 10,
        isCorrect: true,
        points: 10,
      },
      {
        position: 1,
        question: "كم عدد الولايات؟",
        category: "جغرافيا",
        maxPoints: 20,
        isCorrect: false,
        points: 0,
      },
    ],
    correct: 1,
    answered: 2,
    total: 2,
    score: 10,
    possible: 30,
  },
};

describe("ScoreBreakdown", () => {
  it("names the round and its category", () => {
    render(<ScoreBreakdown detail={detail} />);

    expect(screen.getByText(/الجولة 3/)).toBeDefined();
    expect(screen.getByText(/جغرافيا/)).toBeDefined();
  });

  it("says what was right against the round total", () => {
    render(<ScoreBreakdown detail={detail} />);

    expect(screen.getByText(/1 صحيحة من سؤالين/)).toBeDefined();
    expect(screen.getByText(/10 من 30/)).toBeDefined();
  });

  it("shows a line for every question served", () => {
    render(<ScoreBreakdown detail={detail} />);

    expect(screen.getByText("ما عاصمة موريتانيا؟")).toBeDefined();
    expect(screen.getByText("كم عدد الولايات؟")).toBeDefined();
  });

  it("says whether each answer was right and what it paid", () => {
    render(<ScoreBreakdown detail={detail} />);

    expect(screen.getByText("صحيحة")).toBeDefined();
    expect(screen.getByText("خاطئة")).toBeDefined();
    expect(screen.getByText(/0 من 20 نقطة/)).toBeDefined();
  });

  it("keeps the right answers and the time to itself", () => {
    render(<ScoreBreakdown detail={detail} />);

    expect(screen.queryByText(/الصحيح/)).toBeNull();
    expect(screen.queryByText(/اخترت/)).toBeNull();
    expect(screen.queryByText(/ث ·/)).toBeNull();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.queryByText(/الوقت/)).toBeNull();
  });

  it("leaves the formula to the quiz page", () => {
    render(<ScoreBreakdown detail={detail} />);

    expect(screen.queryByText(/كيف تُحتسب النقاط/)).toBeNull();
  });
});
