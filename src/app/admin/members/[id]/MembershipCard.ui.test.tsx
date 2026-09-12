import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MembershipCard from "./MembershipCard";
import {
  deleteMember,
  memberDecision,
  membershipEdit,
  membershipEnding,
  membershipSummary as texts,
  renewForm,
} from "@/lib/texts";
import type { MemberProfile } from "@/components/admin/profileTypes";
import type { MembershipHistory } from "./membershipTypes";
import { renewalRefusalMessage } from "@/lib/renewalMessages";
import type { RenewalRefusal } from "@/lib/renewal";

const REFUSALS: NonNullable<RenewalRefusal>[] = [
  "underReview",
  "notActive",
  "notIssued",
  "alreadyRenewed",
  "yearBehind",
];

const get = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => get(...args),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

type Member = MemberProfile["member"];

const NO_YEARS: MembershipHistory = {
  memberships: [],
  endings: [],
  currentYear: 2026,
  refusal: "underReview",
};

function historyOf(over: Partial<MembershipHistory> = {}): MembershipHistory {
  return { ...NO_YEARS, ...over };
}

function yearOf(over: Partial<MembershipHistory["memberships"][number]> = {}) {
  return {
    id: "y1",
    year: 2025,
    status: "ACTIVE" as const,
    rejectionReason: null,
    paidAmount: 100,
    supportAmount: 0,
    paymentMethod: null,
    recordedBy: null,
    createdAt: "2026-08-20T09:00:00.000Z",
    ...over,
  };
}

beforeEach(() => {
  get.mockReset();
  get.mockImplementation((url: string) =>
    url.includes("/memberships") ? Promise.resolve(NO_YEARS) : Promise.resolve({ methods: [] }),
  );
});

function historyLands(history: MembershipHistory) {
  get.mockImplementation((url: string) =>
    url.includes("/memberships") ? Promise.resolve(history) : Promise.resolve({ methods: [] }),
  );
}

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

  it("sends the admin on to the payment where the amount is edited", async () => {
    await open();

    const link = screen.getByRole("link", { name: new RegExp(texts.openOnPayments) });
    expect(link.getAttribute("href")).toBe("/admin/payments?focus=u1");
  });

  it("offers to record a payment the membership never had", async () => {
    await open({ paidAmount: null, supportAmount: 0 });

    expect(screen.getByText(texts.noPaymentYet)).toBeTruthy();
    expect(screen.queryByRole("link", { name: new RegExp(texts.openOnPayments) })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: new RegExp(texts.recordPayment) }));

    expect(screen.getByLabelText(membershipEdit.amount)).toBeTruthy();
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
    expect(
      screen.getAllByRole("button", { name: new RegExp(texts.toPayment) }).length,
    ).toBeGreaterThan(0);
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
    expect(screen.getByText("2026/09/01")).toBeTruthy();
    expect(screen.getByText("eminyous")).toBeTruthy();
    expect(screen.getByRole("button", { name: new RegExp(membershipEnding.restore) })).toBeTruthy();
    expect(screen.queryByRole("button", { name: new RegExp(membershipEnding.end) })).toBeNull();
  });

  it("keeps an ending on the card after it has been brought back", async () => {
    historyLands(
      historyOf({
        endings: [
          {
            year: 2026,
            reason: "مخالفة النظام الداخلي",
            endedAt: "2026-09-01T00:00:00.000Z",
            endedBy: "amina",
            restoredAt: "2026-09-05T00:00:00.000Z",
            restoredBy: "brahim",
          },
        ],
      }),
    );
    show({ status: "ACTIVE" });

    await waitFor(() => expect(screen.getByText(membershipEnding.broughtBack)).toBeTruthy());
    expect(screen.getByText("مخالفة النظام الداخلي")).toBeTruthy();
    expect(screen.getByText("2026/09/01")).toBeTruthy();
    expect(screen.getByText("amina")).toBeTruthy();
    expect(screen.getByText("2026/09/05")).toBeTruthy();
    expect(screen.getByText("brahim")).toBeTruthy();
  });

  it("keeps both endings legible where a membership was ended twice", async () => {
    historyLands(
      historyOf({
        endings: [
          {
            year: 2026,
            reason: "الأول",
            endedAt: "2026-07-01T00:00:00.000Z",
            endedBy: "amina",
            restoredAt: "2026-07-10T00:00:00.000Z",
            restoredBy: "amina",
          },
          {
            year: 2026,
            reason: "الثاني",
            endedAt: "2026-09-01T00:00:00.000Z",
            endedBy: "brahim",
            restoredAt: "2026-09-05T00:00:00.000Z",
            restoredBy: "brahim",
          },
        ],
      }),
    );
    show({ status: "ACTIVE" });

    await waitFor(() => expect(screen.getByText("الثاني")).toBeTruthy());
    expect(screen.getByText("الأول")).toBeTruthy();
  });

  it("leaves out an ending of another year", async () => {
    historyLands(
      historyOf({
        endings: [
          {
            year: 2025,
            reason: "سنة أخرى",
            endedAt: "2025-09-01T00:00:00.000Z",
            endedBy: "amina",
            restoredAt: "2025-09-05T00:00:00.000Z",
            restoredBy: "amina",
          },
        ],
      }),
    );
    show({ status: "ACTIVE" });

    await waitFor(() => expect(screen.getByText(texts.states.UP_TO_DATE)).toBeTruthy());
    expect(screen.queryByText(membershipEnding.broughtBack)).toBeNull();
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
    expect(
      screen.getAllByRole("button", { name: new RegExp(texts.toPayment) }).length,
    ).toBeGreaterThan(0);
  });
});

describe("one card for the standing and the years", () => {
  it("draws the standing before the years have arrived", () => {
    get.mockImplementation(() => new Promise(() => {}));
    show();

    expect(screen.getByText(texts.title)).toBeTruthy();
    expect(screen.getByText(texts.states.APPLIED)).toBeTruthy();
  });

  it("holds the years under the same heading once they land", async () => {
    historyLands(
      historyOf({ memberships: [yearOf({ year: 2025 }), yearOf({ id: "y2", year: 2024 })] }),
    );
    show();

    await waitFor(() => expect(screen.getByText("2025")).toBeTruthy());
    expect(screen.getByText("2024")).toBeTruthy();
    expect(screen.getAllByText(texts.title)).toHaveLength(1);
  });

  it("offers the renewal where nothing refuses it", async () => {
    historyLands(historyOf({ refusal: null }));
    show({ status: "ACTIVE" });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: new RegExp(renewForm.renew(2026)) })).toBeTruthy(),
    );
  });

  it("offers no amount box where the year is already paid", async () => {
    historyLands(historyOf({ refusal: "alreadyRenewed", memberships: [yearOf({ year: 2026 })] }));
    show({ status: "ACTIVE" });

    await waitFor(() => expect(screen.getByText("2026")).toBeTruthy());
    expect(screen.queryByRole("button", { name: new RegExp(renewForm.renew(2026)) })).toBeNull();
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });

  it("offers no form where renewal is refused, and says why instead", async () => {
    historyLands(historyOf({ refusal: "notActive", memberships: [yearOf()] }));
    show();

    await waitFor(() => expect(screen.getByText("2025")).toBeTruthy());
    expect(screen.queryByRole("button", { name: new RegExp(renewForm.renew(2026)) })).toBeNull();
    expect(screen.queryByRole("spinbutton")).toBeNull();
    expect(screen.getByText(renewalRefusalMessage("notActive"))).toBeTruthy();
  });
});

describe("a membership that cannot be renewed", () => {
  it("names every reason the routes would have refused it with", async () => {
    for (const refusal of REFUSALS) {
      historyLands(historyOf({ refusal, memberships: [yearOf()] }));
      show({ status: "ACTIVE" });

      expect(await screen.findByText(renewalRefusalMessage(refusal))).toBeTruthy();
      cleanup();
    }
  });

  it("offers one way into the payment beside every reason", async () => {
    for (const refusal of REFUSALS) {
      historyLands(historyOf({ refusal, memberships: [yearOf()] }));
      show({ status: "ACTIVE" });

      await screen.findByText(renewalRefusalMessage(refusal));
      expect(screen.getAllByRole("button", { name: new RegExp(texts.toPayment) })).toHaveLength(1);
      cleanup();
    }
  });

  it("opens the payment from the card while the reason is on screen", async () => {
    historyLands(historyOf({ refusal: "underReview", memberships: [yearOf()] }));
    show({ status: "ACTIVE" });

    await screen.findByText(renewalRefusalMessage("underReview"));
    await userEvent.click(screen.getByRole("button", { name: new RegExp(texts.toPayment) }));

    expect(screen.getByText(texts.paymentTitle)).toBeTruthy();
  });

  it("says nothing where the renewal is on offer", async () => {
    historyLands(historyOf({ refusal: null }));
    show({ status: "ACTIVE" });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: new RegExp(renewForm.renew(2026)) })).toBeTruthy(),
    );
    for (const refusal of REFUSALS) {
      expect(screen.queryByText(renewalRefusalMessage(refusal))).toBeNull();
    }
  });
});
