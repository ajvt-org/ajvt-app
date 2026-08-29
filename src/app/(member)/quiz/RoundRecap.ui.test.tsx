import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RoundRecap from "./RoundRecap";

const get = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: (...a: unknown[]) => get(...a) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const recap = {
  round: 2,
  category: "جغرافيا",
  closesAt: "2026-08-27T22:00:00.000Z",
  players: 12,
  questions: [
    {
      id: "q1",
      text: "ما عاصمة موريتانيا؟",
      category: "جغرافيا",
      correct: ["نواكشوط"],
      answered: 10,
      right: 8,
      rate: 80,
    },
    {
      id: "q2",
      text: "سؤال بلا إجابات",
      category: "جغرافيا",
      correct: ["الأولى", "الثانية"],
      answered: 0,
      right: 0,
      rate: null,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  get.mockResolvedValue({ recap });
});

describe("the last round's questions", () => {
  it("names the round it is showing", async () => {
    render(<RoundRecap competitionId="c1" />);

    expect(await screen.findByText(/الجولة 3/)).toBeTruthy();
    expect(screen.getByText(/جغرافيا/)).toBeTruthy();
  });

  it("keeps the questions folded away until they are asked for", async () => {
    render(<RoundRecap competitionId="c1" />);
    await screen.findByText(/الجولة 3/);

    expect(screen.queryByText("ما عاصمة موريتانيا؟")).toBeNull();

    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByText("ما عاصمة موريتانيا؟")).toBeTruthy();
  });

  it("shows the correct answer and the rate of each question", async () => {
    render(<RoundRecap competitionId="c1" />);
    await screen.findByText(/الجولة 3/);
    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByText(/نواكشوط/)).toBeTruthy();
    expect(screen.getByText(/80%/)).toBeTruthy();
    expect(screen.getByText(/8 من 10/)).toBeTruthy();
  });

  it("says nobody answered rather than showing a zero rate", async () => {
    render(<RoundRecap competitionId="c1" />);
    await screen.findByText(/الجولة 3/);
    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByText("لم يجب أحد على هذا السؤال")).toBeTruthy();
  });

  it("labels both answers of a question that has two", async () => {
    render(<RoundRecap competitionId="c1" />);
    await screen.findByText(/الجولة 3/);
    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByText(/الأولى · الثانية/)).toBeTruthy();
    expect(screen.getByText("الإجابات الصحيحة")).toBeTruthy();
  });

  it("shows nothing at all while no round has closed", async () => {
    get.mockResolvedValue({ recap: null });

    const { container } = render(<RoundRecap competitionId="c1" />);

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("reads the round of the competition it was given", async () => {
    render(<RoundRecap competitionId="c9" />);

    await waitFor(() => expect(get).toHaveBeenCalledWith("/api/quiz/recap?competition=c9"));
  });

  it("says what went wrong when the round cannot be read", async () => {
    get.mockRejectedValue(new Error("المسابقة خاصة"));

    render(<RoundRecap competitionId="c1" />);

    expect(await screen.findByText("المسابقة خاصة")).toBeTruthy();
  });
});
