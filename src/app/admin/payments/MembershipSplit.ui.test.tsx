import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MembershipSplit from "./MembershipSplit";
import { paymentCard } from "@/lib/texts";
import { money } from "@/lib/money";
import type { Proof } from "./paymentTypes";

function proofOf(over: Partial<Proof> = {}): Proof {
  return {
    id: "u1",
    kind: "MEMBERSHIP",
    proof: null,
    memberName: "عضو",
    activityTitle: null,
    amount: 2000,
    feeApplied: 1000,
    year: 2026,
    status: "ACTIVE",
    paidOn: null,
    submittedAt: "2026-08-20T09:00:00.000Z",
    ...over,
  };
}

describe("what one membership payment says about itself", () => {
  it("names the fee for the year it was paid for", () => {
    render(<MembershipSplit proof={proofOf()} />);

    expect(screen.getByText(paymentCard.feeForYear(2026))).toBeTruthy();
  });

  it("says how much of the payment was above that fee", () => {
    const { container } = render(<MembershipSplit proof={proofOf()} />);

    expect(screen.getByText(paymentCard.aboveFee)).toBeTruthy();
    expect(container.textContent).toContain(money(1000));
  });

  it("reads as one amount when the payment was exactly the fee", () => {
    const { container } = render(<MembershipSplit proof={proofOf({ amount: 1000 })} />);

    expect(container.textContent).toBe("");
  });

  it("reads as one amount when the payment fell short of the fee", () => {
    const { container } = render(<MembershipSplit proof={proofOf({ amount: 400 })} />);

    expect(container.textContent).toBe("");
  });

  it("says nothing about a payment that is not a membership", () => {
    const { container } = render(
      <MembershipSplit proof={proofOf({ kind: "DONATION", feeApplied: null })} />,
    );

    expect(container.textContent).toBe("");
  });
});
