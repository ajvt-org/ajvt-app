import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import QuestionsSection from "./QuestionsSection";
import { quizQuestionList, quizSettingsForm } from "@/lib/texts";
import { emptySettingsForm, type QuestionRow } from "./types";
import type { QuizQuestionsState } from "./useQuizQuestions";

const question: QuestionRow = {
  id: "q1",
  text: "ما هي عاصمة موريتانيا؟",
  category: "جغرافيا",
  points: 10,
  correctCount: 1,
  order: 0,
  active: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  answers: [{ id: "q1-a", text: "نواكشوط", isCorrect: true, order: 0 }],
  sentCount: 0,
  answeredCount: 0,
  correctSubmissions: 0,
};

function state(over: Partial<QuizQuestionsState> = {}): QuizQuestionsState {
  return {
    loading: false,
    questions: [question],
    banks: [{ id: "general", name: "البنك العام", _count: { questions: 1 } }],
    bankId: "general",
    bankBusy: false,
    bankError: "",
    openBank: vi.fn(),
    createBank: vi.fn(),
    renameBank: vi.fn(),
    deleteBank: vi.fn(),
    settings: null,
    settingsForm: emptySettingsForm,
    settingsError: "",
    savingSettings: false,
    setSettingsForm: vi.fn(),
    saveSettings: vi.fn(),
    toggleConfirm: vi.fn(),
    showImport: false,
    setShowImport: vi.fn(),
    showForm: false,
    setShowForm: vi.fn(),
    editingId: null,
    form: null,
    setForm: vi.fn(),
    formError: "",
    saving: false,
    busyId: null,
    load: vi.fn(),
    openCreate: vi.fn(),
    openEdit: vi.fn(),
    submitQuestionForm: vi.fn(),
    toggleActive: vi.fn(),
    moveQuestion: vi.fn(),
    deleteQuestion: vi.fn(),
    ...over,
  } as unknown as QuizQuestionsState;
}

const follows = (earlier: HTMLElement, later: HTMLElement) =>
  Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);

describe("QuestionsSection", () => {
  it("puts the questions of a bank straight under the bank", () => {
    render(<QuestionsSection state={state()} />);

    const banks = screen.getByText("بنوك الأسئلة");
    const questions = screen.getByText(quizQuestionList.heading(1));

    expect(follows(banks, questions)).toBe(true);
  });

  it("leaves the question settings to their own tab", () => {
    render(<QuestionsSection state={state()} />);

    expect(screen.queryByText(quizSettingsForm.confirmAnswers)).toBeNull();
  });

  it("keeps adding a question on the questions rather than on the bank", () => {
    render(<QuestionsSection state={state()} />);

    const questions = screen.getByText(quizQuestionList.heading(1));
    const create = screen.getByRole("button", { name: new RegExp(quizQuestionList.create) });

    expect(questions.closest("div")?.contains(create)).toBe(true);
    expect(follows(screen.getByText("بنوك الأسئلة"), create)).toBe(true);
  });
});
