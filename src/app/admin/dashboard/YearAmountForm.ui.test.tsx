import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import YearAmountForm from "./YearAmountForm";

const put = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { put: (...args: unknown[]) => put(...args) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

beforeEach(() => {
  put.mockReset();
  put.mockResolvedValue({});
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("YearAmountForm", () => {
  it("says the year carries no amount yet", () => {
    render(<YearAmountForm memberId="m1" year={2026} amount={null} onSaved={() => {}} />);

    expect(screen.getByText("لم يُسجَّل مبلغ لسنة 2026")).toBeDefined();
  });

  it("starts from the amount already on the year", () => {
    render(<YearAmountForm memberId="m1" year={2026} amount={300} onSaved={() => {}} />);

    expect((screen.getByLabelText("المبلغ المسدد") as HTMLInputElement).value).toBe("300");
  });

  it("saves the amount against the member", async () => {
    const onSaved = vi.fn();
    render(<YearAmountForm memberId="m1" year={2026} amount={null} onSaved={onSaved} />);

    await userEvent.type(screen.getByLabelText("المبلغ المسدد"), "500");
    await userEvent.click(screen.getByRole("button", { name: /حفظ/ }));

    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("/api/admin/members/m1/payment", {
        amountTransferred: 500,
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it("refuses an amount under the fee without asking the server", async () => {
    const { container } = render(
      <YearAmountForm memberId="m1" year={2026} amount={null} onSaved={() => {}} />,
    );

    await userEvent.type(screen.getByLabelText("المبلغ المسدد"), "40");
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(screen.getByText(/100 أوقية على الأقل/)).toBeDefined());
    expect(put).not.toHaveBeenCalled();
  });
});
