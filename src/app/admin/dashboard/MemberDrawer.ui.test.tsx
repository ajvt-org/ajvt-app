import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import MemberDrawer from "./MemberDrawer";
import { HOME_VILLAGE } from "@/lib/villages";
import type { Member } from "./types";
import { memberAccount, memberDrawer as texts } from "@/lib/texts";
import { STATUS_LABEL } from "./constants";

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
    recordedByAdmin: false,
    recordedByAdminId: null,
    status: "PENDING",
    rejectionReason: null,
    endedAt: null,
    membershipYear: 2025,
    referenceCode: null,
    memberNumber: "AJVT-2025-0026",
    createdAt: "2026-05-10T09:51:00.000Z",
    user: { phone: "31197975" },
    registrations: [],
    ...over,
  };
}

function show(m: Member, error = "") {
  cleanup();
  render(
    <MemberDrawer
      member={m}
      actionLoading={false}
      error={error}
      showRejectPicker={false}
      rejectReason=""
      onClose={() => {}}
      onZoomProof={() => {}}
      onProofSaved={() => {}}
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

    expect(screen.getByText(texts.membershipYear)).toBeDefined();
    expect(screen.getByText("2025")).toBeDefined();
  });

  it("keeps what the payment is judged on", () => {
    show(member());

    for (const label of [texts.phone, texts.method, texts.requestDate, texts.requestTime]) {
      expect(screen.getByText(label)).toBeDefined();
    }
    expect(screen.getByText(texts.proofTitle)).toBeDefined();
  });
});

describe("what the drawer leaves to the member page", () => {
  it("says nothing about a standing, since a row that opens it is waiting", () => {
    show(member());

    expect(screen.queryByText(STATUS_LABEL.PENDING)).toBeNull();
  });

  it("lists no activity the person registered for", () => {
    show(
      member({
        registrations: [{ activityId: "a1", activity: { id: "a1", title: "دوري الحي" } }],
      }),
    );

    expect(screen.queryByText("دوري الحي")).toBeNull();
  });

  it("offers nothing about the account behind the person", () => {
    show(member());

    expect(screen.queryByText(memberAccount.reset)).toBeNull();
    expect(screen.queryByText(memberAccount.none)).toBeNull();
  });
});
