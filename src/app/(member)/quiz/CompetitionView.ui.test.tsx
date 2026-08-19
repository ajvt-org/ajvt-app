import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CompetitionView, { type StandingsState } from "./CompetitionView";

const post = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { post: (...a: unknown[]) => post(...a) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const standings: StandingsState = {
  running: true,
  competitionId: "c1",
  name: "مسابقة الصيف",
  meId: "u1",
  today: [{ rank: 1, userId: "u2", name: "محمد", photoUrl: null, total: 30 }],
  thisWeek: [],
  overall: [],
  mine: { today: { rank: 4, total: 10 }, thisWeek: null, overall: null },
};

const question = {
  answerId: "aa1",
  text: "ما عاصمة موريتانيا؟",
  category: "جغرافيا",
  points: 10,
  correctCount: 1,
  options: [
    { id: "o1", text: "نواكشوط" },
    { id: "o2", text: "نواذيبو" },
  ],
};

const setup = () =>
  render(<CompetitionView standings={standings} onBack={vi.fn()} onReloadStandings={vi.fn()} />);

beforeEach(() => {
  post.mockReset();
});

describe("CompetitionView", () => {
  it("shows the day's question once the attempt starts", async () => {
    post.mockResolvedValue({
      attemptId: "at1",
      score: 0,
      done: false,
      total: 3,
      position: 0,
      question,
    });
    setup();

    await waitFor(() => expect(screen.getByText("ما عاصمة موريتانيا؟")).toBeDefined());
  });

  it("says why the day is not open, and shows the standings anyway", async () => {
    post.mockRejectedValue(new Error("المسابقة ليست مفتوحة الآن"));
    setup();

    await waitFor(() => expect(screen.getByText("المسابقة ليست مفتوحة الآن")).toBeDefined());
    expect(screen.getByText("ترتيب الجولة")).toBeDefined();
  });

  it("goes straight to the next question when an answer is confirmed", async () => {
    post.mockResolvedValueOnce({
      attemptId: "at1",
      score: 0,
      done: false,
      total: 2,
      position: 0,
      question,
    });
    post.mockResolvedValueOnce({
      attemptId: "at1",
      score: 10,
      done: false,
      total: 2,
      position: 1,
      question: { ...question, answerId: "aa2", text: "سؤال ثان" },
    });
    setup();
    await waitFor(() => screen.getByText("ما عاصمة موريتانيا؟"));

    await userEvent.click(screen.getByRole("radio", { name: "نواكشوط" }));
    await userEvent.click(screen.getByRole("button", { name: "تأكيد الإجابة" }));

    await waitFor(() => expect(screen.getByText("سؤال ثان")).toBeDefined());
    expect(screen.queryByRole("button", { name: "السؤال التالي" })).toBeNull();
  });

  it("carries the running score into the next question", async () => {
    post.mockResolvedValueOnce({
      attemptId: "at1",
      score: 0,
      done: false,
      total: 2,
      position: 0,
      question,
    });
    post.mockResolvedValueOnce({
      attemptId: "at1",
      score: 10,
      done: false,
      total: 2,
      position: 1,
      question: { ...question, answerId: "aa2", text: "سؤال ثان" },
    });
    setup();
    await waitFor(() => screen.getByText("ما عاصمة موريتانيا؟"));

    await userEvent.click(screen.getByRole("radio", { name: "نواكشوط" }));
    await userEvent.click(screen.getByRole("button", { name: "تأكيد الإجابة" }));

    await waitFor(() => expect(screen.getByText(/مجموعك 10/)).toBeDefined());
  });

  it("shows the standings once the attempt is finished", async () => {
    post.mockResolvedValue({
      attemptId: "at1",
      score: 40,
      done: true,
      total: 2,
      position: 2,
      question: null,
    });
    setup();

    await waitFor(() => expect(screen.getByText("أنهيت أسئلة الجولة")).toBeDefined());
    expect(screen.getByText(/مجموعك في الجولة 40/)).toBeDefined();
    expect(screen.getByText("الترتيب العام")).toBeDefined();
  });

  it("shows the member their place when they are off the board", async () => {
    post.mockResolvedValue({
      attemptId: "at1",
      score: 10,
      done: true,
      total: 2,
      position: 2,
      question: null,
    });
    setup();

    await waitFor(() => expect(screen.getByText(/ترتيبك 4 بمجموع 10/)).toBeDefined());
  });

  it("goes back to the list of quizzes rather than out of the section", async () => {
    const onBack = vi.fn();
    post.mockRejectedValue(new Error("المسابقة ليست مفتوحة الآن"));
    render(<CompetitionView standings={standings} onBack={onBack} onReloadStandings={vi.fn()} />);
    await waitFor(() => screen.getByRole("button", { name: "رجوع" }));

    await userEvent.click(screen.getByRole("button", { name: "رجوع" }));

    expect(onBack).toHaveBeenCalled();
  });
});
