import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProofBadges from "./ProofBadges";
import { paymentCard } from "@/lib/texts";
import type { Proof } from "./paymentTypes";

function proofOf(over: Partial<Proof> = {}): Proof {
  return {
    id: "d1",
    kind: "DONATION",
    proof: null,
    memberName: "متبرع",
    activityTitle: null,
    amount: 500,
    status: "PENDING",
    paidOn: null,
    submittedAt: "2026-08-20T09:00:00.000Z",
    ...over,
  };
}

const STATES = [
  ["PENDING", paymentCard.statusPending],
  ["ACTIVE", paymentCard.statusActive],
  ["REJECTED", paymentCard.statusRejected],
] as const;

function shapeOf(proof: Proof, label: string) {
  const { unmount } = render(<ProofBadges proof={proof} />);
  const d = screen.getByLabelText(label).querySelector("path")!.getAttribute("d");
  unmount();
  return d;
}

describe("the marks across the top of a payment card", () => {
  it("carries the Arabic word of each state as its accessible name", () => {
    for (const [status, word] of STATES) {
      const { unmount } = render(<ProofBadges proof={proofOf({ status })} />);
      expect(screen.getByLabelText(word)).toBeTruthy();
      unmount();
    }
  });

  it("says the same word on hover", () => {
    render(<ProofBadges proof={proofOf({ status: "ACTIVE" })} />);

    expect(screen.getByLabelText(paymentCard.statusActive).getAttribute("title")).toBe(
      paymentCard.statusActive,
    );
  });

  it("spends no width on a word the mark already says", () => {
    const { container } = render(<ProofBadges proof={proofOf({ status: "ACTIVE" })} />);

    expect(container.textContent).toBe("");
  });

  it("tells the three states and the hidden gift apart by shape rather than by colour alone", () => {
    const shapes = [
      ...STATES.map(([status, word]) => shapeOf(proofOf({ status }), word)),
      shapeOf(proofOf({ anonymous: true }), paymentCard.hiddenOnBoard),
    ];

    expect(new Set(shapes).size).toBe(shapes.length);
  });

  it("marks a gift linked to an account, and says so", () => {
    render(<ProofBadges proof={proofOf({ userId: "u1" })} />);

    expect(screen.getByLabelText(paymentCard.linked)).toBeTruthy();
  });

  it("marks a gift kept off the public board, and says so", () => {
    render(<ProofBadges proof={proofOf({ anonymous: true })} />);

    expect(screen.getByLabelText(paymentCard.hiddenOnBoard)).toBeTruthy();
  });

  it("marks neither on a membership payment, which is neither", () => {
    render(<ProofBadges proof={proofOf({ kind: "MEMBERSHIP", userId: "u1", anonymous: true })} />);

    expect(screen.queryByLabelText(paymentCard.linked)).toBeNull();
    expect(screen.queryByLabelText(paymentCard.hiddenOnBoard)).toBeNull();
  });
});
