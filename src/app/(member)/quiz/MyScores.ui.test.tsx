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

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({ rounds });
});

describe("MyScores", () => {
  it("lists the rounds the member played", async () => {
    render(<MyScores competitionId="c1" />);

    await waitFor(() => expect(screen.getByText(/الجولة 1/)).toBeDefined());
    expect(screen.getByText(/الجولة 2/)).toBeDefined();
  });

  it("offers no way into a round's answers", async () => {
    render(<MyScores competitionId="c1" />);
    await waitFor(() => screen.getByText(/الجولة 1/));

    expect(screen.queryAllByRole("button")).toHaveLength(0);

    await userEvent.click(screen.getByText(/الجولة 1/));

    expect(get).toHaveBeenCalledTimes(1);
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
});
