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
  roundCount: 5,
  boards: [
    {
      id: "b1",
      title: "ترتيب الجولة",
      blockRounds: 1,
      wholeRun: false,
      block: 3,
      blocks: 4,
      rows: [{ rank: 1, userId: "u1", name: "يوسف", total: 31 }],
    },
    {
      id: "b2",
      title: "الترتيب العام",
      blockRounds: 1,
      wholeRun: true,
      block: 0,
      blocks: 1,
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

  it("offers the board's past blocks and shows the one picked", async () => {
    get.mockImplementation((url: string) =>
      url.includes("board=")
        ? Promise.resolve({ rows: [{ rank: 1, userId: "u2", name: "محمد", total: 12 }] })
        : Promise.resolve(body),
    );
    await unfold();
    await waitFor(() => screen.getByRole("combobox", { name: "فترة الترتيب" }));

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "فترة الترتيب" }), "1");

    await waitFor(() => expect(screen.getByText(/1 · محمد/)).toBeDefined());
    expect(get).toHaveBeenCalledWith("/api/admin/quiz/competitions/c1/standings?board=b1&block=1");
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
