import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuestionList from "./QuestionList";
import { quizQuestionList as texts } from "@/lib/texts";
import type { QuestionRow } from "./types";

function question(id: string, text: string, category: string, answer: string): QuestionRow {
  return {
    id,
    text,
    category,
    points: 10,
    correctCount: 1,
    order: 0,
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    answers: [
      { id: `${id}-a`, text: answer, isCorrect: true, order: 0 },
      { id: `${id}-b`, text: "جواب آخر", isCorrect: false, order: 1 },
    ],
    sentCount: 0,
    answeredCount: 0,
    correctSubmissions: 0,
  };
}

const QUESTIONS = [
  question("1", "ما هي عاصمة موريتانيا؟", "جغرافيا", "نواكشوط"),
  question("2", "كم عدد لاعبي فريق كرة القدم؟", "رياضة", "أحد عشر"),
];

function renderList(questions: QuestionRow[] = QUESTIONS, onMove = vi.fn()) {
  render(
    <QuestionList
      questions={questions}
      busyId={null}
      onCreate={vi.fn()}
      onImport={vi.fn()}
      onEdit={vi.fn()}
      onToggle={vi.fn()}
      onDelete={vi.fn()}
      onMove={onMove}
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

  it("hides the arrows while a search is filtering the list", () => {
    const search = renderList();

    fireEvent.change(search, { target: { value: "عاصمة" } });

    expect(screen.getAllByLabelText("تأخير السؤال").every((b) => b.hasAttribute("disabled"))).toBe(
      true,
    );
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
        onMove={vi.fn()}
      />,
    );

    expect(screen.queryByPlaceholderText("بحث في السؤال أو التصنيف أو الأجوبة...")).toBeNull();
    expect(screen.getByText("لا توجد أسئلة مسجلة بعد")).toBeDefined();
  });
});

describe("QuestionList order", () => {
  it("does not offer to move the first question up nor the last one down", () => {
    renderList();

    const up = screen.getAllByLabelText("تقديم السؤال");
    const down = screen.getAllByLabelText("تأخير السؤال");

    expect(up[0].hasAttribute("disabled")).toBe(true);
    expect(down[0].hasAttribute("disabled")).toBe(false);
    expect(up[1].hasAttribute("disabled")).toBe(false);
    expect(down[1].hasAttribute("disabled")).toBe(true);
  });

  it("says which question moved and which way", () => {
    const onMove = vi.fn();
    renderList(QUESTIONS, onMove);

    fireEvent.click(screen.getAllByLabelText("تأخير السؤال")[0]);

    expect(onMove).toHaveBeenCalledWith(QUESTIONS[0], "down");
  });
});

describe("QuestionCard", () => {
  it("shows the answer that makes the question right", () => {
    renderList();

    expect(screen.getByText("نواكشوط")).toBeDefined();
    expect(screen.getByText("أحد عشر")).toBeDefined();
  });

  it("leaves the wrong answers to the count beside the correct one", () => {
    renderList();

    expect(screen.queryByText("جواب آخر")).toBeNull();
    expect(screen.getAllByText(texts.answerShape(1, 2)).length).toBe(2);
  });

  it("isolates a question written in Latin script from the card around it", () => {
    renderList([{ ...QUESTIONS[0], text: "What is the capital of Mauritania?" }]);

    expect(screen.getByText("What is the capital of Mauritania?").tagName).toBe("BDI");
  });

  it("isolates an answer so a Latin one cannot swap ends with the card", () => {
    renderList([
      { ...QUESTIONS[0], answers: [{ id: "a", text: "Nouakchott", isCorrect: true, order: 0 }] },
    ]);

    expect(screen.getByText("Nouakchott").tagName).toBe("BDI");
  });

  it("says outright when no answer is marked correct", () => {
    renderList([{ ...QUESTIONS[0], answers: [] }]);

    expect(screen.getByText(texts.noCorrect)).toBeDefined();
  });

  it("keeps the play line off a question that has never been sent", () => {
    renderList();

    expect(screen.queryByText(/أُرسلت/)).toBeNull();
  });

  it("shows the play line once a question has been sent", () => {
    renderList([{ ...QUESTIONS[0], sentCount: 12, answeredCount: 9, correctSubmissions: 7 }]);

    expect(screen.getByText(texts.play(12, 9, 7))).toBeDefined();
  });

  it("gives the three actions the same icon only shape as the arrows", () => {
    renderList([QUESTIONS[0]]);

    for (const label of [texts.edit, texts.disable, texts.remove]) {
      expect(screen.getByLabelText(label).textContent).toBe("");
    }
    expect(screen.queryByText(texts.edit)).toBeNull();
  });

  it("offers to bring a disabled question back", () => {
    renderList([{ ...QUESTIONS[0], active: false }]);

    expect(screen.getByLabelText(texts.enable)).toBeDefined();
    expect(screen.getByText(texts.disabled)).toBeDefined();
  });
});
