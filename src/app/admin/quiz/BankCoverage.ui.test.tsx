import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import BankCoverage from "./BankCoverage";

const get = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: (...a: unknown[]) => get(...a) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const body = {
  rounds: [{ index: 0 }, { index: 1 }, { index: 2 }],
  bankSize: 100,
  plannable: 3,
  servedCount: 3,
  startedAt: null as string | null,
};

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue(body);
});

describe("BankCoverage", () => {
  it("shows nothing when there is no competition to speak of", async () => {
    get.mockRejectedValue(new Error("لا توجد مسابقة"));
    const { container } = render(<BankCoverage competitionId="c1" />);

    await waitFor(() => expect(container.textContent).toBe(""));
  });

  it("says how far the bank goes before the start", async () => {
    render(<BankCoverage competitionId="c1" />);

    await waitFor(() => expect(screen.getByText(/البنك يغطي 3 من 3 جولات/)).toBeDefined());
    expect(screen.getByText(/المطلوب 9 أسئلة والمتوفر 100/)).toBeDefined();
  });

  it("flags a bank that cannot cover every round", async () => {
    get.mockResolvedValue({ ...body, plannable: 1, bankSize: 4 });
    render(<BankCoverage competitionId="c1" />);

    await waitFor(() => expect(screen.getByText(/البنك لا يكفي لكل الجولات/)).toBeDefined());
  });

  it("keeps quiet about coverage when every round is planned", async () => {
    render(<BankCoverage competitionId="c1" />);

    await waitFor(() => screen.getByText(/تغطية بنك الأسئلة/));
    expect(screen.queryByText(/البنك لا يكفي/)).toBeNull();
  });

  it("leaves the settings alone once the competition has started", async () => {
    get.mockResolvedValue({ ...body, startedAt: "2026-08-20T00:00:00.000Z", plannable: 1 });
    const { container } = render(<BankCoverage competitionId="c1" />);

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });
});
