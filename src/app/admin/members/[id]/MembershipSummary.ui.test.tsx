import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MembershipSummary from "./MembershipSummary";
import { deleteMember, memberDecision, membershipSummary as texts } from "@/lib/texts";
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
  return render(
    <MembershipSummary member={memberOf(over)} currentYear={2026} onChanged={vi.fn()} />,
  );
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
