import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import MemberDrawer from "./MemberDrawer";
import { HOME_VILLAGE } from "@/lib/villages";
import type { Member } from "./types";
import { memberDrawer as texts } from "@/lib/texts";

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
    village: HOME_VILLAGE,
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
      onProofSaved={() => {}}
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

describe("the way out of the drawer", () => {
  it("offers the member page once, as a control", () => {
    cleanup();
    show(member());

    const links = screen.getAllByRole("link", { name: new RegExp(texts.fullProfile) });

    expect(links).toHaveLength(1);
    expect(links[0].className).toContain("rounded-lg");
    expect(links[0].getAttribute("href")).toContain("/admin/members/m1");
  });

  it("says where it goes rather than what it does", () => {
    cleanup();
    show(member());

    expect(screen.queryByRole("link", { name: /تعديل/ })).toBeNull();
  });
});

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
