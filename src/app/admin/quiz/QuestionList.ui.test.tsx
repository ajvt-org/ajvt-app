import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuestionList from "./QuestionList";
import type { QuestionRow } from "./types";

function question(id: string, text: string, category: string, answer: string): QuestionRow {
  return {
    id,
    text,
    category,
    points: 10,
    correctCount: 1,
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    answers: [{ id: `${id}-a`, text: answer, isCorrect: true, order: 0 }],
    sentCount: 0,
    answeredCount: 0,
    correctSubmissions: 0,
  };
}

const QUESTIONS = [
  question("1", "ما هي عاصمة موريتانيا؟", "جغرافيا", "نواكشوط"),
  question("2", "كم عدد لاعبي فريق كرة القدم؟", "رياضة", "أحد عشر"),
];

function renderList(questions: QuestionRow[] = QUESTIONS) {
  render(
    <QuestionList
      questions={questions}
      busyId={null}
      onCreate={vi.fn()}
      onImport={vi.fn()}
      onEdit={vi.fn()}
      onToggle={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
  return screen.getByPlaceholderText("بحث في السؤال أو التصنيف أو الأجوبة...");
}

describe("QuestionList search", () => {
  it("keeps only the questions whose text matches", () => {
    const search = renderList();

    fireEvent.change(search, { target: { value: "عاصمة" } });

    expect(screen.getByText("ما هي عاصمة موريتانيا؟")).toBeDefined();
    expect(screen.queryByText("كم عدد لاعبي فريق كرة القدم؟")).toBeNull();
  });

  it("matches on the category and on an answer as well", () => {
    const search = renderList();

    fireEvent.change(search, { target: { value: "رياضة" } });
    expect(screen.getByText("كم عدد لاعبي فريق كرة القدم؟")).toBeDefined();

    fireEvent.change(search, { target: { value: "نواكشوط" } });
    expect(screen.getByText("ما هي عاصمة موريتانيا؟")).toBeDefined();
    expect(screen.queryByText("كم عدد لاعبي فريق كرة القدم؟")).toBeNull();
  });

  it("says nothing matched rather than that the bank is empty", () => {
    const search = renderList();

    fireEvent.change(search, { target: { value: "زززز" } });

    expect(screen.getByText("لا يوجد سؤال يطابق البحث")).toBeDefined();
    expect(screen.queryByText("لا توجد أسئلة مسجلة بعد")).toBeNull();
  });

  it("counts the matches against the total while searching", () => {
    const search = renderList();

    fireEvent.change(search, { target: { value: "عاصمة" } });

    expect(screen.getByText("الأسئلة (1/2)")).toBeDefined();
  });

  it("offers no search box for an empty bank", () => {
    render(
      <QuestionList
        questions={[]}
        busyId={null}
        onCreate={vi.fn()}
        onImport={vi.fn()}
        onEdit={vi.fn()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByPlaceholderText("بحث في السؤال أو التصنيف أو الأجوبة...")).toBeNull();
    expect(screen.getByText("لا توجد أسئلة مسجلة بعد")).toBeDefined();
  });
});
