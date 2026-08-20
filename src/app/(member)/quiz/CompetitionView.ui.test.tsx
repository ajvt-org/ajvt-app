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
  round: 2,
  roundCount: 5,
  state: "open",
  next: null,
  closesAt: null,
  me: { played: false, finished: false, score: null },
  curve: { fullSeconds: 10, maxSeconds: 30, floorPercent: 50 },
  boards: [
    {
      id: "b1",
      title: "ترتيب الجولة",
      blockTitle: "",
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
      blockTitle: "",
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

const FUTURE = new Date(Date.now() + 5 * 3_600_000).toISOString();

const setup = (over: Partial<StandingsState> = {}) =>
  render(
    <CompetitionView
      standings={{ ...standings, ...over }}
      onBack={vi.fn()}
      onReloadStandings={vi.fn()}
    />,
  );

const begin = async () => {
  await userEvent.click(screen.getByRole("button", { name: /ابدأ الجولة/ }));
};

beforeEach(() => {
  post.mockReset();
  get.mockReset();
  get.mockResolvedValue({ rounds: [] });
});

describe("CompetitionView", () => {
  it("opens on the quiz page with a start button, not a question", () => {
    setup();

    expect(screen.getByText("الجولة 3 مفتوحة الآن")).toBeDefined();
    expect(screen.getByRole("button", { name: /ابدأ الجولة/ })).toBeDefined();
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText("محمد")).toBeDefined();
  });

  it("serves the first question only after the member starts", async () => {
    post.mockResolvedValue({
      attemptId: "at1",
      done: false,
      total: 3,
      position: 0,
      question,
    });
    setup();

    await begin();

    await waitFor(() => expect(screen.getByText("ما عاصمة موريتانيا؟")).toBeDefined());
    expect(post).toHaveBeenCalledWith("/api/quiz/attempt", { competitionId: "c1" });
  });

  it("offers to resume a round already begun", () => {
    setup({ me: { played: true, finished: false, score: null } });

    expect(screen.getByRole("button", { name: /أكمل الجولة/ })).toBeDefined();
  });

  it("says why the round refused and keeps the standings", async () => {
    post.mockRejectedValue(new Error("المسابقة ليست مفتوحة الآن"));
    setup();

    await begin();

    await waitFor(() => expect(screen.getByText("المسابقة ليست مفتوحة الآن")).toBeDefined());
    expect(screen.getByText("محمد")).toBeDefined();
  });

  it("puts my own scores below the standings, not among the tabs", () => {
    setup();

    expect(screen.queryByRole("tab", { name: "نقاطي" })).toBeNull();
    expect(screen.getByText("محمد")).toBeDefined();
    expect(screen.getByText(/تفاصيل نقاطي/)).toBeDefined();
  });

  it("offers no practice round from inside a quiz", () => {
    setup();

    expect(screen.queryByText("جولة تجريبية")).toBeNull();
  });

  it("shows one ranking at a time and switches on the tab", async () => {
    setup();

    expect(screen.getByText("محمد")).toBeDefined();
    expect(screen.queryByText("أنا")).toBeNull();

    await userEvent.click(screen.getByRole("tab", { name: "الترتيب العام" }));

    expect(screen.getByText("أنا")).toBeDefined();
    expect(screen.queryByText("محمد")).toBeNull();
  });

  it("goes straight to the next question when an answer is confirmed", async () => {
    post.mockResolvedValueOnce({
      attemptId: "at1",
      done: false,
      total: 2,
      position: 0,
      question,
    });
    setup();
    await begin();
    await waitFor(() => screen.getByText("ما عاصمة موريتانيا؟"));
    post.mockResolvedValueOnce({
      attemptId: "at1",
      done: false,
      total: 2,
      position: 1,
      question: { ...question, answerId: "aa2", text: "سؤال ثان" },
    });

    await userEvent.click(screen.getByRole("radio", { name: "نواكشوط" }));
    await userEvent.click(screen.getByRole("button", { name: "تأكيد الإجابة" }));

    await waitFor(() => expect(screen.getByText("سؤال ثان")).toBeDefined());
    expect(screen.queryByText(/مجموعك/)).toBeNull();
  });

  it("returns to the quiz page when the last answer lands", async () => {
    const onBack = vi.fn();
    const onReloadStandings = vi.fn();
    post.mockResolvedValueOnce({
      attemptId: "at1",
      done: false,
      total: 1,
      position: 0,
      question,
    });
    render(
      <CompetitionView
        standings={standings}
        onBack={onBack}
        onReloadStandings={onReloadStandings}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /ابدأ الجولة/ }));
    await waitFor(() => screen.getByText("ما عاصمة موريتانيا؟"));
    post.mockResolvedValueOnce({
      attemptId: "at1",
      done: true,
      total: 1,
      position: 1,
      question: null,
    });

    await userEvent.click(screen.getByRole("radio", { name: "نواكشوط" }));
    await userEvent.click(screen.getByRole("button", { name: "تأكيد الإجابة" }));

    await waitFor(() => expect(onReloadStandings).toHaveBeenCalled());
    expect(onBack).not.toHaveBeenCalled();
    expect(screen.queryByText("ما عاصمة موريتانيا؟")).toBeNull();
    expect(screen.getByRole("tab", { name: "ترتيب الجولة" })).toBeDefined();
  });

  it("greets a finished round with its score, without asking the server", () => {
    setup({ me: { played: true, finished: true, score: 40 } });

    expect(screen.getByText("أنهيت أسئلة الجولة")).toBeDefined();
    expect(screen.getByText(/مجموعك 40 نقطة/)).toBeDefined();
    expect(post).not.toHaveBeenCalled();
  });

  it("never puts a number after the round word, even at zero", () => {
    setup({ me: { played: true, finished: true, score: 0 } });

    expect(screen.queryByText(/الجولة 0/)).toBeNull();
    expect(screen.getByText(/مجموعك 0 نقطة/)).toBeDefined();
  });

  it("shows the member their place when they are off the board", () => {
    setup();

    expect(screen.getByText(/ترتيبك 4 بمجموع 10 نقاط/)).toBeDefined();
  });

  it("counts down to the coming round", () => {
    setup({
      state: "closed",
      next: { index: 2, opensAt: new Date(Date.now() + 3_600_000).toISOString() },
    });

    expect(screen.getByText(/الجولة القادمة 3 من 5/)).toBeDefined();
    expect(screen.getByLabelText("الوقت المتبقي للجولة القادمة").textContent).toMatch(/59:5\d/);
    expect(screen.queryByRole("button", { name: /ابدأ الجولة/ })).toBeNull();
  });

  it("says the competition is over at once, and names the champion", () => {
    setup({ state: "over", next: null });

    expect(screen.getByText("انتهت المسابقة")).toBeDefined();
    expect(screen.getByText("بطل الترتيب العام")).toBeDefined();
    expect(screen.getByText("أنا")).toBeDefined();
    expect(post).not.toHaveBeenCalled();
  });

  it("explains the points on the quiz page itself", () => {
    setup();

    expect(screen.getByText("كيف تُحتسب النقاط")).toBeDefined();
    expect(screen.getByText(/حتى 10 ثوانٍ، كل النقاط/)).toBeDefined();
  });

  it("offers the board's past blocks and shows the one picked", async () => {
    get.mockImplementation((url: string) =>
      url.includes("board=")
        ? Promise.resolve({
            rows: [{ rank: 1, userId: "u3", name: "سالم", photoUrl: null, total: 22 }],
            mine: null,
          })
        : Promise.resolve({ rounds: [] }),
    );
    setup();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "فترة الترتيب" }), "0");

    await waitFor(() => expect(screen.getByText("سالم")).toBeDefined());
    expect(get).toHaveBeenCalledWith("/api/quiz/standings?competition=c1&board=b1&block=0");
    expect(screen.queryByText("محمد")).toBeNull();
  });

  it("titles the round board with the round it shows", () => {
    setup();

    expect(screen.getByText("ترتيب الجولة · الجولة 3")).toBeDefined();
  });

  it("uses the board's own block word in the title and the picker", () => {
    setup({
      roundCount: 28,
      boards: [
        {
          ...standings.boards[0],
          title: "الترتيب الأسبوعي",
          blockTitle: "الأسبوع",
          blockRounds: 7,
          block: 1,
          blocks: 2,
        },
      ],
    });

    expect(screen.getByText("الترتيب الأسبوعي · الأسبوع 2")).toBeDefined();
    expect(screen.getByRole("option", { name: "الأسبوع 1" })).toBeDefined();
  });

  it("goes back to the list of quizzes rather than out of the section", async () => {
    const onBack = vi.fn();
    render(<CompetitionView standings={standings} onBack={onBack} onReloadStandings={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "رجوع" }));

    expect(onBack).toHaveBeenCalled();
  });

  it("says how much of an open round is left", () => {
    setup({ closesAt: new Date(Date.now() + 3 * 3_600_000).toISOString() });

    expect(screen.getByText(/يبقى من الجولة/)).toBeDefined();
    expect(screen.getByLabelText("الوقت المتبقي لإغلاق الجولة").textContent).toMatch(/02:59/);
  });

  it("turns the clock urgent as the door starts to close", () => {
    setup({ closesAt: new Date(Date.now() + 10 * 60_000).toISOString() });

    expect(screen.getByText(/يغلق الباب بعد/)).toBeDefined();
    expect(screen.queryByText(/يبقى من الجولة/)).toBeNull();
  });

  it("keeps the round clock off a round that is not open", () => {
    setup({ state: "closed", closesAt: null, next: { index: 3, opensAt: FUTURE } });

    expect(screen.queryByText(/يبقى من الجولة/)).toBeNull();
    expect(screen.queryByText(/يغلق الباب/)).toBeNull();
  });

  it("tells a member who has finished when the next round opens", () => {
    setup({
      me: { played: true, finished: true, score: 40 },
      closesAt: new Date(Date.now() + 3_600_000).toISOString(),
      next: { index: 4, opensAt: FUTURE },
    });

    expect(screen.getByText(/الجولة القادمة بعد/)).toBeDefined();
    expect(screen.queryByText(/يبقى من الجولة/)).toBeNull();
  });
});
