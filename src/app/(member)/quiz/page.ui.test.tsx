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

function mockFetch() {
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
    expect(screen.getByText("المسابقات التي تشارك فيها")).toBeDefined();
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

    expect(await screen.findByText("المسابقات التي تشارك فيها")).toBeDefined();
  });
});
