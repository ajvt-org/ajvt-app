import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CompetitionView, { type StandingsState } from "./CompetitionView";

const post = vi.fn();
const get = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { post: (...a: unknown[]) => post(...a), get: (...a: unknown[]) => get(...a) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const standings: StandingsState = {
  running: true,
  competitionId: "c1",
  name: "مسابقة الصيف",
  meId: "u1",
  roundCount: 5,
  state: "open",
  next: null,
  curve: { fullSeconds: 10, maxSeconds: 30, floorPercent: 50 },
  boards: [
    {
      id: "b1",
      title: "ترتيب الجولة",
      blockRounds: 1,
      counting: 1,
      wholeRun: false,
      block: 2,
      blocks: 3,
      rows: [{ rank: 1, userId: "u2", name: "محمد", photoUrl: null, total: 30 }],
      mine: { rank: 4, total: 10 },
    },
    {
      id: "b2",
      title: "الترتيب العام",
      blockRounds: 1,
      counting: 1,
      wholeRun: true,
      block: 0,
      blocks: 1,
      rows: [{ rank: 1, userId: "u1", name: "أنا", photoUrl: null, total: 90 }],
      mine: { rank: 1, total: 90 },
    },
  ],
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
  get.mockReset();
  get.mockResolvedValue({ rounds: [] });
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
    expect(screen.getByRole("tab", { name: "ترتيب الجولة" })).toBeDefined();
    expect(screen.getByText("محمد")).toBeDefined();
  });

  it("puts my own scores below the standings, not among the tabs", async () => {
    post.mockRejectedValue(new Error("المسابقة ليست مفتوحة الآن"));
    setup();
    await waitFor(() => screen.getByRole("tab", { name: "ترتيب الجولة" }));

    expect(screen.queryByRole("tab", { name: "نقاطي" })).toBeNull();
    expect(screen.getByText("محمد")).toBeDefined();
    expect(screen.getByText(/تفاصيل نقاطي/)).toBeDefined();
  });

  it("offers no practice round from inside a quiz", async () => {
    post.mockRejectedValue(new Error("المسابقة ليست مفتوحة الآن"));
    setup();
    await waitFor(() => screen.getByRole("tab", { name: "ترتيب الجولة" }));

    expect(screen.queryByText("جولة تجريبية")).toBeNull();
  });

  it("shows one ranking at a time and switches on the tab", async () => {
    post.mockRejectedValue(new Error("المسابقة ليست مفتوحة الآن"));
    setup();
    await waitFor(() => screen.getByRole("tab", { name: "الترتيب العام" }));

    expect(screen.getByText("محمد")).toBeDefined();
    expect(screen.queryByText("أنا")).toBeNull();

    await userEvent.click(screen.getByRole("tab", { name: "الترتيب العام" }));

    expect(screen.getByText("أنا")).toBeDefined();
    expect(screen.queryByText("محمد")).toBeNull();
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

  it("keeps the score off the question screen", async () => {
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
    expect(screen.queryByText(/مجموعك/)).toBeNull();
  });

  it("hands the member back to the quiz list when the last answer lands", async () => {
    const onBack = vi.fn();
    post.mockResolvedValueOnce({
      attemptId: "at1",
      score: 0,
      done: false,
      total: 1,
      position: 0,
      question,
    });
    post.mockResolvedValueOnce({
      attemptId: "at1",
      score: 10,
      done: true,
      total: 1,
      position: 1,
      question: null,
    });
    render(<CompetitionView standings={standings} onBack={onBack} onReloadStandings={vi.fn()} />);
    await waitFor(() => screen.getByText("ما عاصمة موريتانيا؟"));

    await userEvent.click(screen.getByRole("radio", { name: "نواكشوط" }));
    await userEvent.click(screen.getByRole("button", { name: "تأكيد الإجابة" }));

    await waitFor(() => expect(onBack).toHaveBeenCalled());
    expect(screen.queryByText("أنهيت أسئلة الجولة")).toBeNull();
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
    expect(screen.getByText(/مجموعك 40 نقطة/)).toBeDefined();
    expect(screen.getByText("الترتيب العام")).toBeDefined();
  });

  it("never puts a number after the round word, even at zero", async () => {
    post.mockResolvedValue({
      attemptId: "at1",
      score: 0,
      done: true,
      total: 2,
      position: 2,
      question: null,
    });
    setup();

    await waitFor(() => expect(screen.getByText("أنهيت أسئلة الجولة")).toBeDefined());
    expect(screen.queryByText(/الجولة 0/)).toBeNull();
    expect(screen.getByText(/مجموعك 0 نقطة/)).toBeDefined();
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

    await waitFor(() => expect(screen.getByText(/ترتيبك 4 بمجموع 10 نقاط/)).toBeDefined());
  });

  it("names the coming round and its time between two rounds", async () => {
    post.mockRejectedValue(new Error("المسابقة ليست مفتوحة الآن"));
    render(
      <CompetitionView
        standings={{
          ...standings,
          state: "closed",
          next: { index: 2, opensAt: "2026-08-23T08:00:00.000Z" },
        }}
        onBack={vi.fn()}
        onReloadStandings={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText(/الجولة القادمة 3 من 5/)).toBeDefined());
    expect(screen.getByText(/تبدأ/)).toBeDefined();
    expect(screen.queryByText("المسابقة ليست مفتوحة الآن")).toBeNull();
  });

  it("says the competition is over instead of a shut door", async () => {
    post.mockRejectedValue(new Error("المسابقة ليست مفتوحة الآن"));
    render(
      <CompetitionView
        standings={{ ...standings, state: "over", next: null }}
        onBack={vi.fn()}
        onReloadStandings={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText("انتهت المسابقة")).toBeDefined());
    expect(screen.getByText("محمد")).toBeDefined();
    expect(screen.queryByText("المسابقة ليست مفتوحة الآن")).toBeNull();
  });

  it("offers the board's past blocks and shows the one picked", async () => {
    post.mockRejectedValue(new Error("المسابقة ليست مفتوحة الآن"));
    get.mockImplementation((url: string) =>
      url.includes("board=")
        ? Promise.resolve({
            rows: [{ rank: 1, userId: "u3", name: "سالم", photoUrl: null, total: 22 }],
            mine: null,
          })
        : Promise.resolve({ rounds: [] }),
    );
    setup();
    await waitFor(() => screen.getByRole("combobox", { name: "فترة الترتيب" }));

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "فترة الترتيب" }), "0");

    await waitFor(() => expect(screen.getByText("سالم")).toBeDefined());
    expect(get).toHaveBeenCalledWith("/api/quiz/standings?competition=c1&board=b1&block=0");
    expect(screen.queryByText("محمد")).toBeNull();
  });

  it("keeps the whole run board without a block picker", async () => {
    post.mockRejectedValue(new Error("المسابقة ليست مفتوحة الآن"));
    setup();
    await waitFor(() => screen.getByRole("tab", { name: "الترتيب العام" }));

    await userEvent.click(screen.getByRole("tab", { name: "الترتيب العام" }));

    expect(screen.queryByRole("combobox", { name: "فترة الترتيب" })).toBeNull();
  });

  it("explains the points on the quiz page itself", async () => {
    post.mockRejectedValue(new Error("المسابقة ليست مفتوحة الآن"));
    setup();
    await waitFor(() => screen.getByRole("tab", { name: "ترتيب الجولة" }));

    expect(screen.getByText("كيف تُحتسب النقاط")).toBeDefined();
    expect(screen.getByText(/حتى 10 ثوانٍ، كل النقاط/)).toBeDefined();
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
