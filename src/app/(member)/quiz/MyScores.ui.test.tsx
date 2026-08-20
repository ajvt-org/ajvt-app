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
    closed: true,
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
    closed: true,
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
    closed: false,
  },
];

const detail = {
  breakdown: {
    rows: [
      {
        position: 0,
        question: "ما عاصمة موريتانيا؟",
        maxPoints: 10,
        isCorrect: null,
        elapsedMs: null,
        points: 0,
        percent: 0,
        correct: ["نواكشوط"],
        chosen: [],
      },
    ],
    correct: 0,
    answered: 0,
    total: 1,
    score: 0,
    possible: 10,
    elapsedMs: 0,
  },
};

beforeEach(() => {
  get.mockReset();
  get.mockImplementation((url: string) =>
    url.includes("/breakdown/") ? Promise.resolve({ detail }) : Promise.resolve({ rounds }),
  );
});

describe("MyScores", () => {
  it("lists the rounds the member played", async () => {
    render(<MyScores competitionId="c1" />);

    await waitFor(() => expect(screen.getByText(/الجولة 1/)).toBeDefined());
    expect(screen.getByText(/الجولة 2/)).toBeDefined();
  });

  it("opens nothing when the row itself is tapped", async () => {
    render(<MyScores competitionId="c1" />);
    await waitFor(() => screen.getByText(/الجولة 1/));

    await userEvent.click(screen.getByText(/الجولة 1/));

    expect(get).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("ما عاصمة موريتانيا؟")).toBeNull();
  });

  it("keeps a missed round on the list with nothing scored", async () => {
    render(<MyScores competitionId="c1" />);
    await waitFor(() => screen.getByText(/الجولة 2/));

    expect(screen.getByText("لم تشارك")).toBeDefined();
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

  it("opens a closed round into the answers as they were given", async () => {
    render(<MyScores competitionId="c1" />);
    await waitFor(() => screen.getByText(/الجولة 1/));

    await userEvent.click(screen.getByRole("button", { name: "تفاصيل الجولة 1" }));

    expect(await screen.findByText("ما عاصمة موريتانيا؟")).toBeDefined();
    expect(screen.getByText("لم تجب")).toBeDefined();
    expect(get).toHaveBeenCalledWith("/api/quiz/breakdown/a1");
  });

  it("closes the answers again when the member taps once more", async () => {
    render(<MyScores competitionId="c1" />);
    await waitFor(() => screen.getByText(/الجولة 1/));
    await userEvent.click(screen.getByRole("button", { name: "تفاصيل الجولة 1" }));
    await screen.findByText("ما عاصمة موريتانيا؟");

    await userEvent.click(screen.getByRole("button", { name: "تفاصيل الجولة 1" }));

    expect(screen.queryByText("ما عاصمة موريتانيا؟")).toBeNull();
  });

  it("offers nothing to open on a round that is still running", async () => {
    render(<MyScores competitionId="c1" />);
    await waitFor(() => screen.getByText(/الجولة 3/));

    expect(screen.queryByRole("button", { name: "تفاصيل الجولة 3" })).toBeNull();
  });

  it("offers nothing to open on a round the member missed", async () => {
    render(<MyScores competitionId="c1" />);
    await waitFor(() => screen.getByText(/الجولة 2/));

    expect(screen.queryByRole("button", { name: "تفاصيل الجولة 2" })).toBeNull();
  });
});
