import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ProfilePage from "./page";
import { myProfile } from "@/lib/texts";
import type { MemberData } from "@/lib/useMember";

const groups = myProfile.groups;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
}));

vi.mock("qrcode", () => ({
  default: { toDataURL: async () => "data:image/png;base64,QR" },
}));

const state = { member: null as MemberData | null };

vi.mock("@/lib/useMember", () => ({
  useMember: () => ({
    member: state.member,
    setMember: () => {},
    currentYear: 2026,
    loading: false,
    reload: () => {},
    logout: () => {},
  }),
}));

function member(overrides: Partial<MemberData> = {}): MemberData {
  return {
    id: "m1",
    fullName: "سالم ولد المختار",
    user: { phone: "22200000" },
    age: "البدريين",
    village: "التاكلالت",
    paymentMethod: "بنكيلي",
    paidAmount: 700,
    supportAmount: 0,
    membershipYear: 2026,
    surplusAnonymous: false,
    status: "ACTIVE",
    rejectionReason: null,
    endedAt: null,
    createdAt: "2026-08-11T09:00:00.000Z",
    updatedAt: "2026-08-13T09:00:00.000Z",
    memberNumber: "AJVT-2026-0007",
    verifyToken: "0123456789abcdef0123456789abcdef",
    photo: null,
    photoLocked: false,
    registrations: [],
    teamMemberships: [],
    ...overrides,
  } as MemberData;
}

class NoResize {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function show(m: MemberData | null) {
  state.member = m;
  vi.stubGlobal("ResizeObserver", NoResize);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ receipts: [] }) }),
  );
  return render(<ProfilePage />);
}

const shown = (title: string) => !screen.getByText(title).closest("section")!.hidden;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the member's own page under headings", () => {
  it("puts what a member opens the page for above what they touch once a year", () => {
    const { container } = show(member());

    const headings = [...container.querySelectorAll("section > h2")].map((h) => h.textContent);
    expect(headings).toEqual([groups.membership, groups.payments, groups.details, groups.settings]);
  });

  it("heads the membership group for somebody waiting on a decision", () => {
    show(member({ status: "PENDING", memberNumber: null, verifyToken: null }));

    expect(shown(groups.membership)).toBe(true);
    expect(shown(groups.details)).toBe(true);
  });

  it("drops the money and the details, headings included, for an account with no membership", async () => {
    show(null);

    expect(shown(groups.membership)).toBe(true);
    expect(shown(groups.settings)).toBe(true);
    await waitFor(() => expect(shown(groups.payments)).toBe(false));
    expect(shown(groups.details)).toBe(false);
  });

  it("keeps the WhatsApp group with the things a member does, not in the run of facts", () => {
    const { container } = show(member());

    const button = screen.getByText(myProfile.whatsappGroup).closest("a")!;
    expect(button.closest("section")).toBe(screen.getByText(groups.settings).closest("section"));
    expect(container.querySelector("section")!.textContent).not.toContain(myProfile.whatsappGroup);
  });

  it("offers the WhatsApp group only to an accepted member", () => {
    show(member({ status: "PENDING", memberNumber: null, verifyToken: null }));

    expect(screen.queryByText(myProfile.whatsappGroup)).toBeNull();
  });

  it("drops the money group for a member with no support and no receipt", async () => {
    show(member({ status: "REJECTED", memberNumber: null, verifyToken: null, supportAmount: 0 }));

    await waitFor(() => expect(shown(groups.payments)).toBe(false));
    expect(shown(groups.membership)).toBe(true);
    expect(shown(groups.details)).toBe(true);
  });
});
