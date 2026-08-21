import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AnswerReview, { type Review, type ReviewRow } from "./AnswerReview";

const right: ReviewRow = {
  position: 0,
  question: "ما عاصمة موريتانيا؟",
  maxPoints: 10,
  isCorrect: true,
  elapsedMs: 5_000,
  points: 10,
  percent: 100,
  correct: ["نواكشوط"],
  chosen: ["نواكشوط"],
};

const wrong: ReviewRow = {
  position: 1,
  question: "كم عدد ولايات موريتانيا؟",
  maxPoints: 10,
  isCorrect: false,
  elapsedMs: 12_000,
  points: 0,
  percent: 0,
  correct: ["خمس عشرة"],
  chosen: ["اثنتا عشرة"],
};

const missed: ReviewRow = {
  position: 2,
  question: "متى تأسست الرابطة؟",
  maxPoints: 10,
  isCorrect: null,
  elapsedMs: null,
  points: 0,
  percent: 0,
  correct: ["2019"],
  chosen: [],
};

const review: Review = {
  rows: [right, wrong, missed],
  correct: 1,
  answered: 2,
  total: 3,
  score: 10,
  possible: 30,
  elapsedMs: 17_000,
};

describe("AnswerReview", () => {
  it("tells the three outcomes apart", () => {
    render(<AnswerReview review={review} />);

    expect(screen.getByText("إجابة صحيحة")).toBeDefined();
    expect(screen.getByText("إجابة خاطئة")).toBeDefined();
    expect(screen.getByText("لم تجب")).toBeDefined();
  });

  it("shows what the member chose", () => {
    render(<AnswerReview review={review} />);

    expect(screen.getByText("اثنتا عشرة")).toBeDefined();
  });

  it("says so when nothing was chosen at all", () => {
    render(<AnswerReview review={review} />);

    expect(screen.getByText("لم تختر شيئاً")).toBeDefined();
  });

  it("gives the right answer away only where the member did not have it", () => {
    render(<AnswerReview review={review} />);

    expect(screen.getByText("خمس عشرة")).toBeDefined();
    expect(screen.getByText("2019")).toBeDefined();
    expect(screen.getAllByText("نواكشوط")).toHaveLength(1);
  });

  it("counts the round up, missed answers included", () => {
    render(<AnswerReview review={review} />);

    expect(screen.getByText("بلا إجابة")).toBeDefined();
    const tally = screen.getByText("بلا إجابة").parentElement;
    expect(tally?.textContent).toContain("1");
  });

  it("says when a right answer paid less than the full points", () => {
    render(<AnswerReview review={{ ...review, rows: [{ ...right, points: 7, percent: 70 }] }} />);

    expect(screen.getByText(/للسرعة/)).toBeDefined();
  });

  it("keeps the speed note off an answer that paid in full", () => {
    render(<AnswerReview review={{ ...review, rows: [right] }} />);

    expect(screen.queryByText(/للسرعة/)).toBeNull();
  });

  it("says a voided round is voided and reads its total as zero", () => {
    render(<AnswerReview review={review} voided />);

    expect(screen.getByText("ألغيت نقاط هذه الجولة")).toBeDefined();
    const tally = screen.getByText("نقطة").parentElement;
    expect(tally?.textContent).toContain("0");
  });

  it("leaves the questions readable so the member can still review them", () => {
    render(<AnswerReview review={review} voided />);

    expect(screen.getByText("ما عاصمة موريتانيا؟")).toBeDefined();
    expect(screen.getByText("إجابة صحيحة")).toBeDefined();
  });

  it("says nothing of a void on a round that stands", () => {
    render(<AnswerReview review={review} />);

    expect(screen.queryByText("ألغيت نقاط هذه الجولة")).toBeNull();
  });
});

describe("the points and time beside each answer", () => {
  it("carries the optical correction every other icon in the app gets", () => {
    const { container } = render(<AnswerReview review={{ ...review, rows: [right] }} />);

    const icons = [...container.querySelectorAll("svg")];
    const beside = icons.filter((svg) => svg.closest(".icon-label"));

    expect(beside.length).toBeGreaterThanOrEqual(2);
    for (const svg of beside) expect(svg.classList.contains("icon-inline")).toBe(true);
  });

  it("sizes them against the text rather than pinning them to a pixel count", () => {
    const { container } = render(<AnswerReview review={{ ...review, rows: [right] }} />);

    const beside = [...container.querySelectorAll(".icon-label svg")];

    for (const svg of beside) expect(svg.getAttribute("width")).toBe("1.3em");
  });

  it("still shows the seconds and the score it always showed", () => {
    render(<AnswerReview review={{ ...review, rows: [right] }} />);

    expect(screen.getByText("5 ث")).toBeTruthy();
    expect(screen.getByText("10 من 10")).toBeTruthy();
  });
});
