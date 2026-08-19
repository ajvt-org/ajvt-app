import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ScoreBreakdown from "./ScoreBreakdown";
import type { AttemptDetailView } from "./types";

const detail: AttemptDetailView = {
  attemptId: "a1",
  round: 2,
  category: "جغرافيا",
  competitionName: "مسابقة الصيف",
  curve: { fullSeconds: 10, maxSeconds: 30, floorPercent: 50 },
  boards: [
    { title: "ترتيب الجولة", blockRounds: 1, counting: 1, wholeRun: false },
    { title: "الترتيب العام", blockRounds: 7, counting: 6, wholeRun: true },
  ],
  breakdown: {
    rows: [
      {
        position: 0,
        question: "ما عاصمة موريتانيا؟",
        category: "جغرافيا",
        maxPoints: 10,
        isCorrect: true,
        elapsedMs: 5_000,
        points: 10,
        percent: 100,
      },
      {
        position: 1,
        question: "كم عدد الولايات؟",
        category: "جغرافيا",
        maxPoints: 20,
        isCorrect: false,
        elapsedMs: 40_000,
        points: 0,
        percent: 0,
      },
    ],
    correct: 1,
    answered: 2,
    total: 2,
    score: 10,
    possible: 30,
    elapsedMs: 45_000,
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

    expect(screen.getByText(/1 صحيحة من 2/)).toBeDefined();
    expect(screen.getByText(/10 من 30/)).toBeDefined();
  });

  it("shows a line for every question served", () => {
    render(<ScoreBreakdown detail={detail} />);

    expect(screen.getByText("ما عاصمة موريتانيا؟")).toBeDefined();
    expect(screen.getByText("كم عدد الولايات؟")).toBeDefined();
  });

  it("shows the speed share each answer earned", () => {
    render(<ScoreBreakdown detail={detail} />);

    expect(screen.getByText("100%")).toBeDefined();
    expect(screen.getByText("0%")).toBeDefined();
  });

  it("explains the formula from the bands the quiz uses", () => {
    render(<ScoreBreakdown detail={detail} />);

    expect(screen.getByText(/حتى 10 ثانية، كل النقاط/)).toBeDefined();
    expect(screen.getByText(/الترتيب العام، مجموع كل الفترات/)).toBeDefined();
  });
});
