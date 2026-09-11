import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MembershipPaymentDialog from "./MembershipPaymentDialog";
import { paymentDates } from "@/lib/texts";
import { formatDate, formatDateTime } from "@/lib/clubTime";
import type { MemberProfile } from "@/components/admin/profileTypes";

type Member = MemberProfile["member"];

const PAID_ON = "2026-06-11T12:00:00.000Z";
const RECORDED_AT = "2026-08-02T09:31:00.000Z";
const MEMBER_TOUCHED = "2026-09-05T18:00:00.000Z";

function memberOf(over: Partial<Member> = {}): Member {
  return {
    id: "u1",
    fullName: "محمد ولد أحمد",
    phone: "33655124",
    age: "البدريين",
    village: "التاكلالت",
    photo: null,
    photoLocked: false,
    status: "ACTIVE",
    memberNumber: "AJVT-2026-0061",
    paidAmount: 1000,
    supportAmount: 500,
    paymentMethod: null,
    accountId: null,
    account: null,
    paymentProof: null,
    paymentPaidOn: PAID_ON,
    paymentRecordedAt: RECORDED_AT,
    membershipYear: 2026,
    endedAt: null,
    endedReason: null,
    endedBy: null,
    createdAt: "2026-08-02T09:31:00.000Z",
    updatedAt: MEMBER_TOUCHED,
    user: { id: "u1", phone: "33655124", createdAt: "2026-08-02T09:31:00.000Z" },
    registrations: [],
    teamMemberships: [],
    donations: [],
    ...over,
  };
}

function show(over: Partial<Member> = {}) {
  render(
    <MembershipPaymentDialog
      member={memberOf(over)}
      currentYear={2026}
      onChanged={vi.fn()}
      onClose={vi.fn()}
    />,
  );
}

describe("the date on the membership payment dialog", () => {
  it("dates the payment by the moment the money moved", () => {
    show();

    expect(screen.getByText(formatDateTime(PAID_ON)).parentElement?.textContent).toContain(
      paymentDates.paidOn,
    );
  });

  it("never dates the payment by the member's own row", () => {
    show();

    expect(screen.queryByText(new RegExp(formatDate(MEMBER_TOUCHED)))).toBeNull();
  });

  it("falls back to the day the payment was recorded, and says so", () => {
    show({ paymentPaidOn: null });

    expect(screen.getByText(formatDateTime(RECORDED_AT)).parentElement?.textContent).toContain(
      paymentDates.recordedOn,
    );
  });

  it("shows no date at all for a membership with no payment behind it", () => {
    show({ paymentPaidOn: null, paymentRecordedAt: null });

    expect(screen.queryByText(new RegExp(formatDate(RECORDED_AT)))).toBeNull();
  });
});
