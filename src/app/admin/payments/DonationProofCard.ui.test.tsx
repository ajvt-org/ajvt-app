import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DonationProofCard from "./DonationProofCard";
import { confirmDialog, donationActions } from "@/lib/texts";
import type { Proof } from "./paymentTypes";

const PROOF: Proof = {
  id: "d1",
  kind: "DONATION",
  proof: "one.webp",
  memberName: "محمد",
  activityTitle: null,
  amount: 500,
  status: "PENDING",
  source: "PUBLIC",
  paidOn: "2026-08-18T12:00:00.000Z",
  submittedAt: "2026-08-20T09:00:00.000Z",
};

function show(over: { error?: string; onDelete?: () => void } = {}) {
  const onDelete = over.onDelete ?? vi.fn();
  render(
    <DonationProofCard
      proof={PROOF}
      members={[]}
      destinations={[]}
      financeTags={[]}
      busy={false}
      error={over.error ?? ""}
      onReview={vi.fn()}
      onDelete={onDelete}
      onLink={vi.fn()}
      onPatch={vi.fn()}
    />,
  );
  return onDelete;
}

describe("removing a donation", () => {
  it("asks through the app rather than through the browser", async () => {
    const confirmed = vi.fn();
    vi.stubGlobal("confirm", confirmed);
    show();

    await userEvent.click(screen.getByRole("button", { name: donationActions.remove }));

    expect(confirmed).not.toHaveBeenCalled();
    expect(screen.getByText(donationActions.confirmRemove)).toBeTruthy();
    vi.unstubAllGlobals();
  });

  it("waits for the answer before removing anything", async () => {
    const onDelete = show();

    await userEvent.click(screen.getByRole("button", { name: donationActions.remove }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("removes once the reader says so", async () => {
    const onDelete = show();

    await userEvent.click(screen.getByRole("button", { name: donationActions.remove }));
    const [, inDialog] = screen.getAllByRole("button", { name: donationActions.remove });
    await userEvent.click(inDialog);

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("removes nothing when the reader backs out", async () => {
    const onDelete = show();

    await userEvent.click(screen.getByRole("button", { name: donationActions.remove }));
    await userEvent.click(screen.getByRole("button", { name: confirmDialog.cancel }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByText(donationActions.confirmRemove)).toBeNull();
  });
});

describe("what went wrong with a donation", () => {
  it("says it on the card rather than in a box the browser draws", () => {
    show({ error: "تعذر الحذف" });

    expect(screen.getByText("تعذر الحذف")).toBeTruthy();
  });

  it("says nothing while nothing has gone wrong", () => {
    show();

    expect(screen.queryByText("تعذر الحذف")).toBeNull();
  });
});
