import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyScores from "./MyScores";

const get = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: (...a: unknown[]) => get(...a) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const rounds = [
  {
    attemptId: "a1",
    round: 0,
    category: "جغرافيا",
    score: 30,
    correct: 2,
    total: 3,
    finishedAt: null,
    missed: false,
  },
  {
    attemptId: null,
    round: 1,
    category: null,
    score: 0,
    correct: 0,
    total: 0,
    finishedAt: null,
    missed: true,
  },
  {
    attemptId: "a2",
    round: 2,
    category: null,
    score: 10,
    correct: 1,
    total: 3,
    finishedAt: null,
    missed: false,
  },
];

const detail = {
  attemptId: "a1",
  round: 0,
  category: "جغرافيا",
  competitionName: "مسابقة",
  breakdown: {
    rows: [
      {
        position: 0,
        question: "ما عاصمة موريتانيا؟",
        category: "جغرافيا",
        maxPoints: 10,
        isCorrect: true,
        points: 10,
      },
    ],
    correct: 1,
    answered: 1,
    total: 1,
    score: 10,
    possible: 10,
  },
};

beforeEach(() => {
  get.mockReset();
  get.mockImplementation((url: string) =>
    url.includes("?competition=") ? Promise.resolve({ rounds }) : Promise.resolve({ detail }),
  );
});

describe("MyScores", () => {
  it("lists the rounds the member played", async () => {
    render(<MyScores competitionId="c1" />);

    await waitFor(() => expect(screen.getByText(/الجولة 1/)).toBeDefined());
    expect(screen.getByText(/الجولة 2/)).toBeDefined();
  });

  it("opens the breakdown of the round that was picked", async () => {
    render(<MyScores competitionId="c1" />);
    await waitFor(() => screen.getByText(/الجولة 1/));

    await userEvent.click(screen.getByText(/الجولة 1/));

    await waitFor(() => expect(screen.getByText("ما عاصمة موريتانيا؟")).toBeDefined());
    expect(get).toHaveBeenCalledWith("/api/quiz/breakdown/a1");
  });

  it("goes back to the list of rounds", async () => {
    render(<MyScores competitionId="c1" />);
    await waitFor(() => screen.getByText(/الجولة 1/));
    await userEvent.click(screen.getByText(/الجولة 1/));
    await waitFor(() => screen.getByText("ما عاصمة موريتانيا؟"));

    await userEvent.click(screen.getByRole("button", { name: /كل الجولات/ }));

    await waitFor(() => expect(screen.queryByText("ما عاصمة موريتانيا؟")).toBeNull());
  });

  it("keeps a missed round on the list without a way in", async () => {
    render(<MyScores competitionId="c1" />);
    await waitFor(() => screen.getByText(/الجولة 2/));

    expect(screen.getByText("لم تشارك")).toBeDefined();
    expect(screen.getAllByRole("button")).toHaveLength(2);

    await userEvent.click(screen.getByText(/الجولة 2/));

    expect(screen.queryByText("ما عاصمة موريتانيا؟")).toBeNull();
  });

  it("says so when the member has played nothing", async () => {
    get.mockResolvedValue({ rounds: [] });
    render(<MyScores competitionId="c1" />);

    await waitFor(() => expect(screen.getByText(/لم تشارك في أي جولة/)).toBeDefined());
  });

  it("shows what the server refused", async () => {
    get.mockRejectedValue(new Error("هذه المسابقة خاصة"));
    render(<MyScores competitionId="c1" />);

    await waitFor(() => expect(screen.getByText(/هذه المسابقة خاصة/)).toBeDefined());
  });
});
