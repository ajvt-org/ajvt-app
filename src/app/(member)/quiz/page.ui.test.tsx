import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuizPage from "./page";

const push = vi.fn();
let search = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(search),
}));

const COMPETITION = {
  id: "c1",
  name: "مسابقة الصيف",
  visibility: "PUBLIC",
  roundCount: 12,
  startsAt: "2026-08-20T08:00:00.000Z",
  state: "open",
  passedRounds: 2,
  myScore: 40,
};

const STANDINGS = {
  running: true,
  competitionId: "c1",
  name: "مسابقة الصيف",
  meId: "u1",
  round: 1,
  roundCount: 12,
  state: "open",
  next: null,
  me: { played: false, finished: false, score: null },
  curve: { fullSeconds: 10, maxSeconds: 30, floorPercent: 50 },
  boards: [],
};

const TUTORIAL = {
  questions: [
    {
      id: "t1",
      text: "ما عاصمة موريتانيا؟",
      category: "تجربة",
      points: 10,
      correctCount: 1,
      options: [
        { id: "t1a", text: "نواكشوط" },
        { id: "t1b", text: "نواذيبو" },
      ],
      correctIds: ["t1a"],
    },
  ],
  curve: { fullSeconds: 3, maxSeconds: 10, floorPercent: 50 },
};

function mockFetch(tutorial: unknown = TUTORIAL) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (String(url).startsWith("/api/quiz/competitions")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ competitions: [COMPETITION], confirmAnswers: true }),
        };
      }
      if (String(url).startsWith("/api/quiz/standings")) {
        return { ok: true, status: 200, json: async () => STANDINGS };
      }
      if (String(url).startsWith("/api/quiz/tutorial")) {
        return { ok: true, status: 200, json: async () => tutorial };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    }),
  );
}

describe("QuizPage", () => {
  beforeEach(() => {
    push.mockClear();
    search = "";
    mockFetch();
  });

  it("shows the picker when the URL names no competition", async () => {
    render(<QuizPage />);

    expect(await screen.findByText("مسابقة الصيف")).toBeDefined();
    expect(screen.getByText("ركن التجربة")).toBeDefined();
  });

  it("opens the practice round on the questions the bank holds", async () => {
    render(<QuizPage />);
    await screen.findByText("مسابقة الصيف");

    await userEvent.click(screen.getByRole("button", { name: /ابدأ الجولة التجريبية/ }));

    expect(await screen.findByText("ما عاصمة موريتانيا؟")).toBeDefined();
  });

  it("offers no practice round when the tutorial bank is empty", async () => {
    mockFetch({ questions: [], curve: TUTORIAL.curve });
    render(<QuizPage />);

    expect(await screen.findByText("مسابقة الصيف")).toBeDefined();
    expect(screen.queryByText("ركن التجربة")).toBeNull();
  });

  it("offers no practice round when the tutorial cannot be read", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).startsWith("/api/quiz/tutorial")
          ? { ok: false, status: 500, json: async () => ({}) }
          : {
              ok: true,
              status: 200,
              json: async () => ({ competitions: [COMPETITION], confirmAnswers: true }),
            },
      ),
    );
    render(<QuizPage />);

    expect(await screen.findByText("مسابقة الصيف")).toBeDefined();
    expect(screen.queryByText("ركن التجربة")).toBeNull();
  });

  it("puts the picked competition in the URL", async () => {
    render(<QuizPage />);

    await userEvent.click(await screen.findByText("مسابقة الصيف"));

    expect(push).toHaveBeenCalledWith("/quiz?competition=c1");
  });

  it("opens the competition the URL names, so a tab switch can come back to it", async () => {
    search = "competition=c1";
    render(<QuizPage />);

    await waitFor(() => {
      expect(screen.getByText(/مفتوحة الآن/)).toBeDefined();
    });
  });

  it("falls back to the picker when the standings answer for another competition", async () => {
    search = "competition=deleted";
    render(<QuizPage />);

    expect(await screen.findByText("مسابقة الصيف")).toBeDefined();
  });

  it("sends a visitor back to the screen that opened the quiz", async () => {
    search = "from=%2Factivities";
    render(<QuizPage />);
    await screen.findByText("مسابقة الصيف");

    expect(screen.getByLabelText("رجوع").getAttribute("href")).toBe("/activities");
  });

  it("sends a visitor who arrived cold to the landing page rather than a list they never opened", async () => {
    render(<QuizPage />);
    await screen.findByText("مسابقة الصيف");

    expect(screen.getByLabelText("رجوع").getAttribute("href")).toBe("/");
  });

  it("carries the screen that opened the quiz into the competition", async () => {
    search = "from=%2Fhome";
    render(<QuizPage />);

    await userEvent.click(await screen.findByText("مسابقة الصيف"));

    expect(push).toHaveBeenCalledWith("/quiz?competition=c1&from=%2Fhome");
  });
});
