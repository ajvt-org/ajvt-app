import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import AdminSupportersPage from "./page";
import { moneyDigits } from "@/lib/money";
import { adminSupporters } from "@/lib/texts";

const get = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: (...args: unknown[]) => get(...args) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

function entry(rank: number, name: string, total: number) {
  return { rank, position: rank, name, photoUrl: null, total, anonymous: false };
}

const BOARD = {
  rows: [entry(1, "أحمد", 5000), entry(2, "سالم", 3000)],
  count: 2,
  given: 8000,
};

function tileFor(label: string) {
  return screen.getByText(label).closest("div")!;
}

describe("the admin supporters board", () => {
  beforeEach(() => {
    get.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("reads the board from the admin route", async () => {
    get.mockResolvedValue(BOARD);

    render(<AdminSupportersPage />);

    await waitFor(() => expect(screen.getByText("أحمد")).toBeDefined());
    expect(get).toHaveBeenCalledWith("/api/admin/supporters");
  });

  it("shows how many supporters there are and what they gave together", async () => {
    get.mockResolvedValue(BOARD);

    render(<AdminSupportersPage />);

    await waitFor(() => expect(tileFor(adminSupporters.count).textContent).toContain("2"));
    expect(tileFor(adminSupporters.given).textContent).toContain(moneyDigits(8000));
  });

  it("ranks the supporters under the totals", async () => {
    get.mockResolvedValue(BOARD);

    render(<AdminSupportersPage />);

    await waitFor(() => expect(screen.getByText("أحمد")).toBeDefined());
    expect(screen.getByText("سالم")).toBeDefined();
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("says the board is empty rather than showing an empty table", async () => {
    get.mockResolvedValue({ rows: [], count: 0, given: 0 });

    render(<AdminSupportersPage />);

    await waitFor(() => expect(screen.getByText(adminSupporters.empty)).toBeDefined());
    expect(screen.queryByRole("table")).toBeNull();
    expect(tileFor(adminSupporters.count).textContent).toContain("0");
  });

  it("says so when the board cannot be read", async () => {
    get.mockRejectedValue(new Error("ليست لديك صلاحية"));

    render(<AdminSupportersPage />);

    await waitFor(() => expect(screen.getByText(/ليست لديك صلاحية/)).toBeDefined());
    expect(screen.queryByRole("table")).toBeNull();
  });
});
