import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PaidAmountRows from "./PaidAmountRows";
import { ouguiya } from "@/lib/texts/currency";
import { paidAmount as texts } from "@/lib/texts/paidAmount";

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
    const { container } = render(<PaidAmountRows paidAmount={100} supportAmount={0} Row={Row} />);

    expect(screen.getByText(texts.paid)).toBeDefined();
    expect(container.textContent).toContain(ouguiya.amount(100));
    expect(screen.queryByText(texts.support)).toBeNull();
  });

  it("splits the fee from the support and totals them", () => {
    const { container } = render(
      <PaidAmountRows paidAmount={100} supportAmount={2000} Row={Row} />,
    );

    expect(screen.getByText(texts.fee)).toBeDefined();
    expect(container.textContent).toContain(ouguiya.amount(100));
    expect(screen.getByText(texts.support)).toBeDefined();
    expect(container.textContent).toContain(ouguiya.amount(2000));
    expect(screen.getByText(texts.total)).toBeDefined();
    expect(container.textContent).toContain(ouguiya.amount(2100));
  });

  it("never shows the member a total below what they were charged", () => {
    const { container } = render(<PaidAmountRows paidAmount={100} supportAmount={-50} Row={Row} />);

    expect(container.textContent).toContain(ouguiya.amount(100));
    expect(screen.queryByText(texts.support)).toBeNull();
  });
});
