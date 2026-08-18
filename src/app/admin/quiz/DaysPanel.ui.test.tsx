import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DaysPanel from "./DaysPanel";

const get = vi.fn();
const post = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const body = {
  days: [
    { day: "2026-08-20", index: 0, loaded: 4 },
    { day: "2026-08-21", index: 1, loaded: 0 },
    { day: "2026-08-22", index: 2, loaded: 4 },
  ],
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

describe("DaysPanel", () => {
  it("shows nothing when there is no competition to speak of", async () => {
    get.mockRejectedValue(new Error("لا توجد مسابقة"));
    const { container } = render(<DaysPanel questionCount={0} />);

    await waitFor(() => expect(container.textContent).toBe(""));
  });

  it("says how many days are ready against how many there are", async () => {
    render(<DaysPanel questionCount={100} />);

    await waitFor(() => expect(screen.getByText(/جاهز 2 من 3 يوماً/)).toBeDefined());
  });

  it("says what the bank still needs", async () => {
    render(<DaysPanel questionCount={100} />);

    await waitFor(() => expect(screen.getByText(/المطلوب 12 سؤالاً والمتوفر 100/)).toBeDefined());
  });

  it("spreads the bank when asked", async () => {
    render(<DaysPanel questionCount={100} />);
    await waitFor(() => screen.getByRole("button", { name: /توزيع الأسئلة/ }));

    await userEvent.click(screen.getByRole("button", { name: /توزيع الأسئلة/ }));

    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/admin/quiz/days/fill", {}));
    expect(screen.getByText(/تم توزيع الأسئلة على 3 يوماً/)).toBeDefined();
  });

  it("shows what the server refused", async () => {
    post.mockRejectedValue(new Error("المخزون لا يكفي"));
    render(<DaysPanel questionCount={5} />);
    await waitFor(() => screen.getByRole("button", { name: /توزيع الأسئلة/ }));

    await userEvent.click(screen.getByRole("button", { name: /توزيع الأسئلة/ }));

    await waitFor(() => expect(screen.getByText(/المخزون لا يكفي/)).toBeDefined());
  });

  it("stops offering to change the days once it has started", async () => {
    get.mockResolvedValue({ ...body, startedAt: "2026-08-20T00:00:00.000Z" });
    render(<DaysPanel questionCount={100} />);

    await waitFor(() => expect(screen.getByText(/لا يمكن تغيير/)).toBeDefined());
    expect(screen.queryByRole("button", { name: /توزيع الأسئلة/ })).toBeNull();
  });
});
