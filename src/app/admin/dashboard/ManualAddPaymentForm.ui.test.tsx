import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ManualAddPaymentForm, { type PaymentForm } from "./ManualAddPaymentForm";
import { emptyPaymentForm } from "./constants";
import { answering } from "@tests/ui/paymentMethods";
import { manualAdd } from "@/lib/texts";

function show(membershipFee: number | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn(answering(async () => ({ ok: true, status: 200, json: async () => ({}) }))),
  );
  render(
    <ManualAddPaymentForm
      form={emptyPaymentForm as PaymentForm}
      setForm={vi.fn()}
      membershipFee={membershipFee}
      personName="محمد ولد أحمد"
      proofPreview={null}
      proofUploading={false}
      error=""
      loading={false}
      onProof={vi.fn()}
      onSkip={vi.fn()}
      onSubmit={vi.fn()}
    />,
  );
  return screen.getByLabelText(manualAdd.paidAmountLabel);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the amount an admin records when adding a member by hand", () => {
  it("takes its minimum from the club's configured fee", () => {
    const amount = show(250);

    expect(amount.getAttribute("min")).toBe("250");
    expect(amount.getAttribute("placeholder")).toBe("250");
  });

  it("follows the fee wherever it is set rather than a number of its own", () => {
    const amount = show(4000);

    expect(amount.getAttribute("min")).toBe("4000");
    expect(amount.getAttribute("placeholder")).toBe("4000");
  });

  it("states no minimum while the fee is still unknown", () => {
    const amount = show(null);

    expect(amount.getAttribute("min")).toBeNull();
    expect(amount.getAttribute("placeholder")).toBeNull();
  });
});
