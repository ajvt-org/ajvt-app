import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MembershipCard from "./MembershipCard";
import {
  deleteMember,
  memberDecision,
  membershipEnding,
  membershipSummary as texts,
} from "@/lib/texts";
import type { MemberProfile } from "@/components/admin/profileTypes";

type Member = MemberProfile["member"];

function memberOf(over: Partial<Member> = {}): Member {
  return {
    id: "u1",
    fullName: "محمد ولد أحمد",
    phone: "33655124",
    age: "البدريين",
    village: "التاكلالت",
    photo: null,
    photoLocked: false,
    status: "PENDING",
    memberNumber: "AJVT-2026-0061",
    paidAmount: 1000,
    supportAmount: 500,
    paymentMethod: null,
    accountId: null,
    account: null,
    paymentProof: null,
    paymentPaidOn: "2026-08-18T12:00:00.000Z",
    paymentRecordedAt: "2026-08-20T09:00:00.000Z",
    membershipYear: 2026,
    endedAt: null,
    endedReason: null,
    endedBy: null,
    createdAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
    user: { id: "u1", phone: "33655124", createdAt: "2026-08-20T09:00:00.000Z" },
    registrations: [],
    teamMemberships: [],
    donations: [],
    ...over,
  };
}

function show(over: Partial<Member> = {}) {
  return render(<MembershipCard member={memberOf(over)} currentYear={2026} onChanged={vi.fn()} />);
}

async function open(over: Partial<Member> = {}) {
  show(over);
  await userEvent.click(screen.getByRole("button", { name: new RegExp(texts.toPayment) }));
}

describe("reading one member's membership payment", () => {
  it("opens it where the admin already is instead of sending them to the list", async () => {
    show();

    expect(screen.queryByRole("link", { name: new RegExp(texts.toPayment) })).toBeNull();
    expect(screen.getByRole("button", { name: new RegExp(texts.toPayment) })).toBeTruthy();
  });

  it("frames what opens as the payment", async () => {
    await open();

    expect(screen.getByText(texts.paymentTitle)).toBeTruthy();
  });

  it("carries the verbs that act on the payment", async () => {
    await open();

    expect(screen.getByRole("button", { name: new RegExp(memberDecision.accept) })).toBeTruthy();
    expect(screen.getByRole("button", { name: new RegExp(memberDecision.refuse) })).toBeTruthy();
    expect(screen.getByRole("button", { name: /استبدال الإثبات|إضافة إثبات/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: new RegExp(deleteMember.payment) })).toBeTruthy();
  });

  it("leaves the verbs out of the card while the payment is closed", () => {
    show();

    expect(screen.queryByRole("button", { name: new RegExp(memberDecision.refuse) })).toBeNull();
    expect(screen.queryByRole("button", { name: new RegExp(deleteMember.payment) })).toBeNull();
  });

  it("says so where a membership carries no proof", async () => {
    await open({ paymentProof: null });

    expect(screen.getByText(texts.noProof)).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("shows the proof and links to the file it came from", async () => {
    await open({ paymentProof: "receipt.webp" });

    expect(screen.queryByText(texts.noProof)).toBeNull();
    const link = screen.getByRole("link", { name: new RegExp(texts.viewProof) });
    expect(link.getAttribute("href")).toBe("/api/files/receipt.webp");
  });

  it("says the standing and the year once inside the payment too", async () => {
    await open();

    expect(screen.getAllByText(texts.states.APPLIED)).toHaveLength(2);
  });

  it("closes back onto the member", async () => {
    await open();

    await userEvent.click(screen.getByRole("button", { name: "إغلاق" }));

    expect(screen.queryByText(texts.paymentTitle)).toBeNull();
    expect(screen.getByRole("button", { name: new RegExp(texts.toPayment) })).toBeTruthy();
  });
});

describe("one card for one membership year", () => {
  it("says the standing and the year once", () => {
    show();

    expect(screen.getAllByText(texts.states.APPLIED)).toHaveLength(1);
    expect(screen.getAllByText("2026")).toHaveLength(1);
  });

  it("offers to end a membership that stands", () => {
    show({ status: "ACTIVE" });

    expect(screen.getByRole("button", { name: new RegExp(membershipEnding.end) })).toBeTruthy();
  });

  it("draws why a membership ended, when, and by whom, over the way back", () => {
    show({
      status: "ACTIVE",
      endedAt: "2026-09-01T00:00:00.000Z",
      endedReason: "مخالفة النظام الداخلي",
      endedBy: "eminyous",
    });

    expect(screen.getByText(texts.states.ENDED)).toBeTruthy();
    expect(screen.getByText("مخالفة النظام الداخلي")).toBeTruthy();
    expect(screen.getByText("2026-09-01")).toBeTruthy();
    expect(screen.getByText("eminyous")).toBeTruthy();
    expect(screen.getByRole("button", { name: new RegExp(membershipEnding.restore) })).toBeTruthy();
    expect(screen.queryByRole("button", { name: new RegExp(membershipEnding.end) })).toBeNull();
  });

  it("reads a membership that never became one, with nothing to end", () => {
    show({ status: "REJECTED", membershipYear: 2025 });

    expect(screen.getByText(texts.states.APPLICATION_REFUSED)).toBeTruthy();
    expect(screen.getByText("2025")).toBeTruthy();
    expect(screen.queryByRole("button", { name: new RegExp(membershipEnding.end) })).toBeNull();
    expect(screen.getByRole("button", { name: new RegExp(texts.toPayment) })).toBeTruthy();
  });

  it("keeps the payment reachable while a reason for ending is being picked", async () => {
    show({ status: "ACTIVE" });

    await userEvent.click(screen.getByRole("button", { name: new RegExp(membershipEnding.end) }));

    expect(screen.getByLabelText(membershipEnding.reasonLabel)).toBeTruthy();
    expect(screen.getByRole("button", { name: new RegExp(texts.toPayment) })).toBeTruthy();
  });
});
