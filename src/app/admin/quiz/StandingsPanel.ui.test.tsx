import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StandingsPanel from "./StandingsPanel";

const get = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: (...a: unknown[]) => get(...a) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const body = {
  running: true,
  round: 3,
  boards: [
    {
      id: "b1",
      title: "ترتيب الجولة",
      rows: [{ rank: 1, userId: "u1", name: "يوسف", total: 31 }],
    },
    {
      id: "b2",
      title: "الترتيب العام",
      rows: [
        { rank: 1, userId: "u1", name: "يوسف", total: 41 },
        { rank: 2, userId: "u2", name: "محمد", total: 30 },
      ],
    },
  ],
};

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue(body);
});

const unfold = async () => {
  render(<StandingsPanel competitionId="c1" />);
  await userEvent.click(screen.getByRole("button", { name: /ترتيب هذه المسابقة/ }));
};

describe("StandingsPanel", () => {
  it("offers a tab for every board the competition names", async () => {
    await unfold();

    await waitFor(() => expect(screen.getByRole("button", { name: "ترتيب الجولة" })).toBeDefined());
    expect(screen.getByRole("button", { name: "الترتيب العام" })).toBeDefined();
  });

  it("shows the first board's rows with rank and total", async () => {
    await unfold();

    await waitFor(() => expect(screen.getByText(/1 · يوسف/)).toBeDefined());
    expect(screen.getByText("31")).toBeDefined();
  });

  it("switches boards on the tab", async () => {
    await unfold();
    await waitFor(() => screen.getByRole("button", { name: "الترتيب العام" }));

    await userEvent.click(screen.getByRole("button", { name: "الترتيب العام" }));

    expect(screen.getByText(/2 · محمد/)).toBeDefined();
  });

  it("says there is no ranking only when the board is empty", async () => {
    get.mockResolvedValue({
      running: true,
      round: 0,
      boards: [{ id: "b1", title: "ترتيب الجولة", rows: [] }],
    });
    await unfold();

    await waitFor(() => expect(screen.getByText("لا ترتيب بعد")).toBeDefined());
  });
});
