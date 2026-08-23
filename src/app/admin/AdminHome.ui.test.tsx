import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import AdminHome from "./AdminHome";

const get = vi.fn();
const replace = vi.fn();

const FakeApiError = vi.hoisted(
  () =>
    class FakeApiError extends Error {
      status: number;
      constructor(status: number) {
        super("failed");
        this.status = status;
      }
    },
);

vi.mock("@/lib/api", () => ({
  api: { get: (...args: unknown[]) => get(...args) },
  ApiError: FakeApiError,
  errorMessage: (e: unknown) => (e as Error).message,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const SUMMARY = {
  year: 2026,
  membership: { current: 8, active: 10, former: 2 },
  money: { revenue: 5000, spending: 2000, net: 3000 },
  handling: { pendingMembers: 1, pendingRegistrations: 2, pendingPayments: 0, total: 3 },
};

beforeEach(() => {
  get.mockReset();
  replace.mockReset();
  get.mockResolvedValue(SUMMARY);
});

afterEach(() => {
  cleanup();
});

describe("the admin home", () => {
  it("answers the three questions", async () => {
    render(<AdminHome />);

    expect(await screen.findByText("8 / 10")).toBeTruthy();
    expect(screen.getByText("3000 أوقية")).toBeTruthy();
  });

  it("sends a scoped admin somewhere they can work instead of spinning", async () => {
    get.mockRejectedValue(new FakeApiError(403));

    render(<AdminHome />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/activities"));
  });

  it("sends a signed-out admin to the login", async () => {
    get.mockRejectedValue(new FakeApiError(401));

    render(<AdminHome />);

    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(replace.mock.calls[0][0]).toContain("/admin/login");
  });

  it("says what went wrong rather than spinning forever", async () => {
    get.mockRejectedValue(new Error("الشبكة"));

    render(<AdminHome />);

    expect(await screen.findByText("الشبكة")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });
});
