import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import MemberDrawer from "./MemberDrawer";
import type { Member } from "./types";

vi.mock("@/lib/api", () => ({
  api: { get: () => Promise.reject(new Error("offline")) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

function member(over: Partial<Member> = {}): Member {
  return {
    id: "m1",
    userId: "u1",
    fullName: "الشيخ ولد أحمد",
    phone: null,
    age: "المحسنين",
    paymentMethod: "بنكيلي",
    paymentProof: null,
    photo: null,
    paidAmount: 100,
    supportAmount: 400,
    status: "ACTIVE",
    rejectionReason: null,
    membershipYear: 2025,
    referenceCode: null,
    memberNumber: "AJVT-2025-0026",
    createdAt: "2026-05-10T09:51:00.000Z",
    user: { phone: "31197975" },
    registrations: [],
    ...over,
  };
}

function show(m: Member) {
  cleanup();
  render(
    <MemberDrawer
      member={m}
      actionLoading={false}
      settingsYear={2026}
      resetLoading={false}
      tempPassword={null}
      tempPasswordHours={1}
      accountPhone=""
      attachLoading={false}
      attachError=""
      showRejectPicker={false}
      rejectReason=""
      onClose={() => {}}
      onZoomProof={() => {}}
      onResetPassword={() => {}}
      onAccountPhone={() => {}}
      onAttachAccount={() => {}}
      onRejectReason={() => {}}
      onOpenRejectPicker={() => {}}
      onCloseRejectPicker={() => {}}
      onApprove={() => {}}
      onReject={() => {}}
    />,
  );
}

describe("MemberDrawer facts", () => {
  it("names the membership year the amounts belong to", () => {
    show(member());

    expect(screen.getByText("سنة العضوية")).toBeDefined();
    expect(screen.getByText("2025")).toBeDefined();
  });

  it("warns when an active member has not renewed the running year", () => {
    show(member());

    expect(screen.getByText(/لم يجدد عضوية 2026/)).toBeDefined();
  });

  it("stays quiet for a member already on the running year", () => {
    show(member({ membershipYear: 2026, memberNumber: "AJVT-2026-0001" }));

    expect(screen.queryByText(/لم يجدد عضوية/)).toBeNull();
  });

  it("stays quiet for a pending request, where renewal is not the question", () => {
    show(member({ status: "PENDING", memberNumber: null }));

    expect(screen.queryByText(/لم يجدد عضوية/)).toBeNull();
  });
});
