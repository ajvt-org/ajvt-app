import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import RoundsPanel from "./RoundsPanel";

const get = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: (...a: unknown[]) => get(...a) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const body = {
  rounds: [
    {
      index: 0,
      opensAt: "2026-08-20T08:00:00.000Z",
      closesAt: "2026-08-20T22:00:00.000Z",
      category: null,
      loaded: 0,
    },
    {
      index: 1,
      opensAt: "2026-08-21T08:00:00.000Z",
      closesAt: "2026-08-21T22:00:00.000Z",
      category: null,
      loaded: 0,
    },
    {
      index: 2,
      opensAt: "2026-08-22T08:00:00.000Z",
      closesAt: "2026-08-22T22:00:00.000Z",
      category: null,
      loaded: 0,
    },
  ],
  bankSize: 100,
  plannable: 3,
  servedCount: 3,
  startedAt: null as string | null,
};

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue(body);
});

describe("RoundsPanel", () => {
  it("shows nothing when there is no competition to speak of", async () => {
    get.mockRejectedValue(new Error("لا توجد مسابقة"));
    const { container } = render(<RoundsPanel competitionId="c1" />);

    await waitFor(() => expect(container.textContent).toBe(""));
  });

  it("says how far the bank goes before the start", async () => {
    render(<RoundsPanel competitionId="c1" />);

    await waitFor(() => expect(screen.getByText(/البنك يغطي 3 من 3 جولات/)).toBeDefined());
    expect(screen.getByText(/المطلوب 9 أسئلة والمتوفر 100/)).toBeDefined();
  });

  it("flags a bank that cannot cover every round", async () => {
    get.mockResolvedValue({ ...body, plannable: 1, bankSize: 4 });
    render(<RoundsPanel competitionId="c1" />);

    await waitFor(() => expect(screen.getByText(/البنك لا يكفي لكل الجولات/)).toBeDefined());
  });

  it("keeps quiet about coverage when every round is planned", async () => {
    render(<RoundsPanel competitionId="c1" />);

    await waitFor(() => screen.getByText(/جولات المسابقة/));
    expect(screen.queryByText(/البنك لا يكفي/)).toBeNull();
  });

  it("names the category of a round drawn from one", async () => {
    get.mockResolvedValue({
      ...body,
      rounds: [{ ...body.rounds[0], category: "جغرافيا" }],
    });
    render(<RoundsPanel competitionId="c1" />);

    await waitFor(() => expect(screen.getByText(/جغرافيا/)).toBeDefined());
  });

  it("locks the rounds once the run has started", async () => {
    get.mockResolvedValue({
      ...body,
      startedAt: "2026-08-20T00:00:00.000Z",
      rounds: body.rounds.map((r) => ({ ...r, loaded: 3 })),
    });
    render(<RoundsPanel competitionId="c1" />);

    await waitFor(() => expect(screen.getByText(/لا يمكن تغيير/)).toBeDefined());
    expect(screen.queryByText(/البنك يغطي/)).toBeNull();
  });
});
