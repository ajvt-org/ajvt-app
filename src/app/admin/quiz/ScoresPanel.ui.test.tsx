import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScoresPanel from "./ScoresPanel";

const get = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: (...a: unknown[]) => get(...a) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const attempts = [
  { attemptId: "a1", name: "أحمد", score: 30, finishedAt: null },
  { attemptId: "a2", name: "محمد", score: 10, finishedAt: null },
];

const detail = {
  attemptId: "a1",
  name: "أحمد",
  round: 0,
  category: "جغرافيا",
  breakdown: {
    rows: [
      {
        position: 0,
        question: "ما عاصمة موريتانيا؟",
        maxPoints: 10,
        isCorrect: true,
        elapsedMs: 5_000,
        points: 10,
        percent: 100,
      },
    ],
    correct: 1,
    answered: 1,
    total: 1,
    score: 10,
    possible: 10,
    elapsedMs: 5_000,
  },
};

beforeEach(() => {
  get.mockReset();
  get.mockImplementation((url: string) =>
    url.includes("/attempts?round=") ? Promise.resolve({ attempts }) : Promise.resolve({ detail }),
  );
});

describe("ScoresPanel", () => {
  it("lists who played the round it opens on", async () => {
    render(<ScoresPanel competitionId="c1" roundCount={3} />);

    await waitFor(() => expect(screen.getByText("أحمد")).toBeDefined());
    expect(get.mock.calls[0][0]).toBe("/api/admin/quiz/competitions/c1/attempts?round=0");
  });

  it("reads another round when one is chosen", async () => {
    render(<ScoresPanel competitionId="c1" roundCount={3} />);
    await waitFor(() => screen.getByText("أحمد"));

    await userEvent.selectOptions(screen.getByLabelText("الجولة"), "2");

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith("/api/admin/quiz/competitions/c1/attempts?round=1"),
    );
  });

  it("opens a member's breakdown", async () => {
    render(<ScoresPanel competitionId="c1" roundCount={3} />);
    await waitFor(() => screen.getByText("أحمد"));

    await userEvent.click(screen.getByText("أحمد"));

    await waitFor(() => expect(screen.getByText("ما عاصمة موريتانيا؟")).toBeDefined());
    expect(get).toHaveBeenCalledWith("/api/admin/quiz/attempts/a1");
  });

  it("closes the breakdown again", async () => {
    render(<ScoresPanel competitionId="c1" roundCount={3} />);
    await waitFor(() => screen.getByText("أحمد"));
    await userEvent.click(screen.getByText("أحمد"));
    await waitFor(() => screen.getByText("ما عاصمة موريتانيا؟"));

    await userEvent.click(screen.getByRole("button", { name: /إغلاق/ }));

    await waitFor(() => expect(screen.queryByText("ما عاصمة موريتانيا؟")).toBeNull());
  });

  it("says so when nobody played the round", async () => {
    get.mockResolvedValue({ attempts: [] });
    render(<ScoresPanel competitionId="c1" roundCount={3} />);

    await waitFor(() => expect(screen.getByText(/لم يشارك أحد/)).toBeDefined());
  });
});
