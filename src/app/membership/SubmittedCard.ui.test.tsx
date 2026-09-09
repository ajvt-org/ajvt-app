import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SubmittedCard from "./SubmittedCard";
import type { PaymentValues } from "./constants";
import { membershipSubmitted } from "@/lib/texts";

const FORM: PaymentValues & { fullName: string } = {
  paymentMethod: "بنكيلي",
  accountId: "a1",
  bankReference: "",
  paidAmount: "1500",
  referenceCode: "AJVT-2026-0007",
  fullName: "محمد ولد أحمد",
};

function show(over: { renewing?: boolean; showsReferenceCode?: boolean } = {}) {
  render(
    <SubmittedCard
      form={FORM}
      editing={false}
      renewing={over.renewing ?? false}
      showsReferenceCode={over.showsReferenceCode ?? true}
      copied={null}
      onCopy={vi.fn()}
      onShare={vi.fn()}
      onProfile={vi.fn()}
    />,
  );
}

describe("what a member is shown after sending the form", () => {
  it("shows the code, its copy button and the share button where the association shows it", () => {
    show();

    expect(screen.getByText("AJVT-2026-0007")).toBeDefined();
    expect(screen.getByText(membershipSubmitted.copy)).toBeDefined();
    expect(screen.getByText(membershipSubmitted.shareReference)).toBeDefined();
  });

  it("takes the card, its button and the share button together where it does not", () => {
    show({ showsReferenceCode: false });

    expect(screen.queryByText("AJVT-2026-0007")).toBeNull();
    expect(screen.queryByText(membershipSubmitted.copy)).toBeNull();
    expect(screen.queryByText(membershipSubmitted.shareReference)).toBeNull();
  });

  it("keeps the summary and the way back to the account either way", () => {
    show({ showsReferenceCode: false });

    expect(screen.getByText(membershipSubmitted.summary)).toBeDefined();
    expect(screen.getByText("محمد ولد أحمد")).toBeDefined();
    expect(screen.getByText(membershipSubmitted.toProfile)).toBeDefined();
  });

  it("shows no code on a renewal, which never had one to show", () => {
    show({ renewing: true });

    expect(screen.queryByText("AJVT-2026-0007")).toBeNull();
    expect(screen.getByText(membershipSubmitted.sentRenewal)).toBeDefined();
  });
});
