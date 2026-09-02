import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PaidAmountRows from "./PaidAmountRows";

const Row = ({ label, value }: { label: string; value: string }) => (
  <div>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

describe("PaidAmountRows", () => {
  it("says nothing when no amount was recorded", () => {
    const { container } = render(<PaidAmountRows paidAmount={null} supportAmount={0} Row={Row} />);

    expect(container.textContent).toBe("");
  });

  it("shows a single line for a member who paid only the fee", () => {
    render(<PaidAmountRows paidAmount={100} supportAmount={0} Row={Row} />);

    expect(screen.getByText("المبلغ المسدد")).toBeDefined();
    expect(screen.getByText("100 أوقية")).toBeDefined();
    expect(screen.queryByText("مبلغ الدعم")).toBeNull();
  });

  it("splits the fee from the support and totals them", () => {
    render(<PaidAmountRows paidAmount={100} supportAmount={2000} Row={Row} />);

    expect(screen.getByText("رسوم الاشتراك")).toBeDefined();
    expect(screen.getByText("100 أوقية")).toBeDefined();
    expect(screen.getByText("مبلغ الدعم")).toBeDefined();
    expect(screen.getByText("2.000 أوقية")).toBeDefined();
    expect(screen.getByText("إجمالي ما دُفع")).toBeDefined();
    expect(screen.getByText("2.100 أوقية")).toBeDefined();
  });

  it("never shows the member a total below what they were charged", () => {
    render(<PaidAmountRows paidAmount={100} supportAmount={-50} Row={Row} />);

    expect(screen.getByText("100 أوقية")).toBeDefined();
    expect(screen.queryByText("مبلغ الدعم")).toBeNull();
  });
});
