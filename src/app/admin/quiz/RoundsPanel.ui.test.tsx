import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RoundsPanel from "./RoundsPanel";

const get = vi.fn();
const post = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const body = {
  rounds: [
    {
      index: 0,
      opensAt: "2026-08-20T08:00:00.000Z",
      closesAt: "2026-08-20T22:00:00.000Z",
      category: null,
      loaded: 4,
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
      loaded: 4,
    },
  ],
  bankSize: 100,
  servedCount: 3,
  poolSize: 4,
  startedAt: null as string | null,
};

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  get.mockResolvedValue(body);
  post.mockResolvedValue({ filled: 3 });
});

describe("RoundsPanel", () => {
  it("shows nothing when there is no competition to speak of", async () => {
    get.mockRejectedValue(new Error("لا توجد مسابقة"));
    const { container } = render(<RoundsPanel competitionId="c1" />);

    await waitFor(() => expect(container.textContent).toBe(""));
  });

  it("says how many rounds are ready against how many there are", async () => {
    render(<RoundsPanel competitionId="c1" />);

    await waitFor(() => expect(screen.getByText(/جاهزة 2 من 3 جولة/)).toBeDefined());
  });

  it("says what the bank still needs", async () => {
    render(<RoundsPanel competitionId="c1" />);

    await waitFor(() =>
      expect(screen.getByText(/المطلوب 12 سؤالاً والمتوفر في البنك 100/)).toBeDefined(),
    );
  });

  it("spreads the bank when asked", async () => {
    render(<RoundsPanel competitionId="c1" />);
    await waitFor(() => screen.getByRole("button", { name: /توزيع الأسئلة/ }));

    await userEvent.click(screen.getByRole("button", { name: /توزيع الأسئلة/ }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/api/admin/quiz/competitions/c1/rounds/fill", {}),
    );
    expect(screen.getByText(/تم توزيع الأسئلة على 3 جولة/)).toBeDefined();
  });

  it("shows what the server refused", async () => {
    post.mockRejectedValue(new Error("المخزون لا يكفي"));
    render(<RoundsPanel competitionId="c1" />);
    await waitFor(() => screen.getByRole("button", { name: /توزيع الأسئلة/ }));

    await userEvent.click(screen.getByRole("button", { name: /توزيع الأسئلة/ }));

    await waitFor(() => expect(screen.getByText(/المخزون لا يكفي/)).toBeDefined());
  });

  it("names the category of a round drawn from one", async () => {
    get.mockResolvedValue({
      ...body,
      rounds: [{ ...body.rounds[0], category: "جغرافيا" }],
    });
    render(<RoundsPanel competitionId="c1" />);

    await waitFor(() => expect(screen.getByText(/جغرافيا/)).toBeDefined());
  });

  it("stops offering to change the rounds once it has started", async () => {
    get.mockResolvedValue({ ...body, startedAt: "2026-08-20T00:00:00.000Z" });
    render(<RoundsPanel competitionId="c1" />);

    await waitFor(() => expect(screen.getByText(/لا يمكن تغيير/)).toBeDefined());
    expect(screen.queryByRole("button", { name: /توزيع الأسئلة/ })).toBeNull();
  });
});
