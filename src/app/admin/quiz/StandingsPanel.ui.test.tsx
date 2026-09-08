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
      rows: [
        { rank: 1, userId: "u1", name: "يوسف", photoUrl: "/api/files/member/m1.webp", total: 31 },
      ],
    },
    {
      id: "b2",
      title: "الترتيب العام",
      blockRounds: 1,
      wholeRun: true,
      block: 0,
      blocks: 1,
      rows: [
        { rank: 1, userId: "u1", name: "يوسف", photoUrl: null, total: 41 },
        { rank: 2, userId: "u2", name: "محمد", photoUrl: null, total: 30 },
      ],
    },
  ],
};

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue(body);
});

describe("StandingsPanel", () => {
  it("offers a tab for every board the competition names", async () => {
    render(<StandingsPanel competitionId="c1" />);

    await waitFor(() => expect(screen.getByRole("button", { name: "ترتيب الجولة" })).toBeDefined());
    expect(screen.getByRole("button", { name: "الترتيب العام" })).toBeDefined();
  });

  it("shows the first board's rows with rank and total", async () => {
    render(<StandingsPanel competitionId="c1" />);

    await waitFor(() => expect(screen.getByRole("listitem")).toBeDefined());
    const row = screen.getByRole("listitem").textContent;
    expect(row).toContain("يوسف");
    expect(row).toContain("1");
    expect(row).toContain("31");
  });

  it("draws the participant the way the member board does", async () => {
    render(<StandingsPanel competitionId="c1" />);

    const photo = (await screen.findByAltText("يوسف")) as HTMLImageElement;
    expect(photo.src).toContain("/api/files/member/m1-thumb.webp");
  });

  it("leaves out the highlight and the closing line a supervisor has no place in", async () => {
    render(<StandingsPanel competitionId="c1" />);

    await waitFor(() => screen.getByRole("listitem"));
    expect(screen.queryByText(/ترتيبك/)).toBeNull();
  });

  it("switches boards on the tab", async () => {
    render(<StandingsPanel competitionId="c1" />);
    await waitFor(() => screen.getByRole("button", { name: "الترتيب العام" }));

    await userEvent.click(screen.getByRole("button", { name: "الترتيب العام" }));

    const rows = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(rows[0]).toContain("يوسف");
    expect(rows[1]).toContain("محمد");
  });

  it("offers the board's past blocks and shows the one picked", async () => {
    get.mockImplementation((url: string) =>
      url.includes("board=")
        ? Promise.resolve({
            rows: [{ rank: 1, userId: "u2", name: "محمد", photoUrl: null, total: 12 }],
          })
        : Promise.resolve(body),
    );
    render(<StandingsPanel competitionId="c1" />);
    await waitFor(() => screen.getByRole("combobox", { name: "فترة الترتيب" }));

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "فترة الترتيب" }), "1");

    await waitFor(() => expect(screen.getByRole("listitem").textContent).toContain("محمد"));
    expect(get).toHaveBeenCalledWith("/api/admin/quiz/competitions/c1/standings?board=b1&block=1");
  });

  it("says there is no ranking only when the board is empty", async () => {
    get.mockResolvedValue({
      running: true,
      round: 0,
      boards: [{ id: "b1", title: "ترتيب الجولة", rows: [] }],
    });
    render(<StandingsPanel competitionId="c1" />);

    await waitFor(() => expect(screen.getByText("لا ترتيب بعد")).toBeDefined());
  });
});
