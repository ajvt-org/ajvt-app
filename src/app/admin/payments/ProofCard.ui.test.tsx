import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ProofCard from "./ProofCard";
import { paymentCard } from "@/lib/texts";
import { money } from "@/lib/money";
import type { MemberOption, Proof } from "./paymentTypes";

const ACCOUNT: MemberOption = {
  id: "m1",
  userId: "u1",
  fullName: "أبوبكر لمرابط",
  memberNumber: "AJVT-2026-0061",
  phone: "33655124",
  village: "التاكلالت",
  age: "البدريين",
  photo: null,
};

const NO_ACCOUNT_ID = { ...ACCOUNT, userId: undefined } as unknown as MemberOption;

const REUSE = [{ kind: "member", id: "m9", label: "أحمد", date: "2026-08-01T00:00:00.000Z" }];

function mockFetch(reuse: unknown[] = REUSE) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ reuse }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function proofOf(over: Partial<Proof> = {}): Proof {
  return {
    id: "d1",
    kind: "DONATION",
    proof: "same.webp",
    memberName: "محمد",
    activityTitle: null,
    amount: 500,
    status: "PENDING",
    source: "PUBLIC",
    uploadedAt: "2026-08-20T09:00:00.000Z",
    submittedAt: "2026-08-20T09:00:00.000Z",
    ...over,
  };
}

function show(over: Partial<Proof> = {}, members: MemberOption[] = []) {
  return render(
    <ProofCard
      proof={proofOf(over)}
      members={members}
      activities={[]}
      financeTags={[]}
      busy={false}
      onReview={vi.fn()}
      onDelete={vi.fn()}
      onLink={vi.fn()}
      onPatch={vi.fn()}
    />,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("a donation being reviewed", () => {
  it("warns that the screenshot has been sent before", async () => {
    mockFetch();
    show();

    expect(await screen.findByText(/نفس الكابتير مستعمل من قبل/)).toBeTruthy();
    expect(screen.getByText("أحمد")).toBeTruthy();
  });

  it("asks about the donation itself, so it is left out of its own answer", async () => {
    const fetchMock = mockFetch();
    show();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("filename=same.webp");
    expect(url).toContain("kind=donation");
    expect(url).toContain("id=d1");
  });

  it("says nothing when the screenshot is used once", async () => {
    mockFetch([]);
    show();

    await waitFor(() => expect(screen.queryByText(/مستعمل من قبل/)).toBeNull());
  });
});

describe("the other kinds on the same list", () => {
  it("asks about a membership proof as a member", async () => {
    const fetchMock = mockFetch();
    show({ id: "m1", kind: "MEMBERSHIP", amount: null });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0][0])).toContain("kind=member");
  });

  it("leaves an activity registration alone, which the check does not cover", async () => {
    const fetchMock = mockFetch();
    show({ id: "r1", kind: "ACTIVITY", activityTitle: "الدوري", amount: null });

    await waitFor(() => expect(screen.getByText("الدوري")).toBeTruthy());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the amount on its own, not buried in the status", () => {
    mockFetch([]);
    const { container } = show({ amount: 2000 });

    expect(container.textContent).toContain(money(2000));
    expect(screen.getByText(paymentCard.statusPending).textContent).toBe(paymentCard.statusPending);
  });

  it("drops the name typed by hand once the gift is linked to an account", () => {
    mockFetch([]);
    show({ memberName: "أبوبكر لمرابط", donorName: "ابو", userId: "u1" });

    expect(screen.getByText("أبوبكر لمرابط")).toBeTruthy();
    expect(screen.queryByText(/الاسم المكتوب/)).toBeNull();
    expect(screen.queryByText("ابو")).toBeNull();
  });

  it("shows the name typed by hand while the gift is linked to nobody", () => {
    mockFetch([]);
    show({ memberName: "متبرع مجهول", donorName: "ابو", userId: null });

    expect(screen.getByText(paymentCard.storedName("ابو"))).toBeTruthy();
  });

  it("says nothing about a stored name that already matches", () => {
    mockFetch([]);
    show({ memberName: "أحمد", donorName: "أحمد" });

    expect(screen.queryByText(/الاسم المكتوب/)).toBeNull();
  });

  it("says when a gift is hidden from the public board", () => {
    mockFetch([]);
    show({ anonymous: true });

    expect(screen.getByText(paymentCard.hiddenOnBoard)).toBeTruthy();
  });

  it("says nothing about hiding a gift that is named", () => {
    mockFetch([]);
    show({ anonymous: false });

    expect(screen.queryByText(paymentCard.hiddenOnBoard)).toBeNull();
  });

  it("shows who the gift is linked to, with enough to confirm it", () => {
    mockFetch([]);
    show({ userId: "u1" }, [ACCOUNT]);

    expect(screen.getByText(/AJVT-2026-0061/)).toBeTruthy();
  });

  it("links to the receipt and says whether it still stands", () => {
    mockFetch([]);
    show({ receipt: { number: "R-2026-0243", status: "ACTIVE", token: "t".repeat(32) } });

    const link = screen.getByRole("link", { name: /R-2026-0243/ });
    expect(link.getAttribute("href")).toBe(`/receipt/${"t".repeat(32)}`);
    expect(screen.getByText(new RegExp(paymentCard.receiptActive))).toBeTruthy();
  });

  it("marks a voided receipt as voided", () => {
    mockFetch([]);
    show({ receipt: { number: "R-2026-0242", status: "VOID", token: "t".repeat(32) } });

    expect(screen.getByText(new RegExp(paymentCard.receiptVoid))).toBeTruthy();
  });

  it("does not link a receipt whose token is withheld", () => {
    mockFetch([]);
    show({ receipt: { number: "R-2026-0244", status: "ACTIVE" } });

    expect(screen.queryByRole("link", { name: /R-2026-0244/ })).toBeNull();
  });

  it("still names the receipt and its state when the token is withheld", () => {
    mockFetch([]);
    show({ receipt: { number: "R-2026-0244", status: "ACTIVE" } });

    expect(screen.getByText(/R-2026-0244/)).toBeTruthy();
    expect(screen.getByText(new RegExp(paymentCard.receiptActive))).toBeTruthy();
  });
});

describe("the account shown under a payment", () => {
  it("is the one who paid, on a membership card", () => {
    mockFetch([]);
    show({ id: "u1", kind: "MEMBERSHIP", amount: null, userId: "u1" }, [ACCOUNT]);

    expect(screen.getByText(/AJVT-2026-0061/)).toBeTruthy();
  });

  it("is the one who paid, on an activity card", () => {
    mockFetch([]);
    show({ id: "r1", kind: "ACTIVITY", activityTitle: "الدوري", amount: null, userId: "u1" }, [
      ACCOUNT,
    ]);

    expect(screen.getByText(/AJVT-2026-0061/)).toBeTruthy();
  });

  it("is nobody on a gift nobody linked", () => {
    mockFetch([]);
    show({ userId: null }, [ACCOUNT]);

    expect(screen.queryByText(/AJVT-2026-0061/)).toBeNull();
  });

  it("is nobody when the payment names an account that is not on the list", () => {
    mockFetch([]);
    show({ userId: "u9" }, [ACCOUNT]);

    expect(screen.queryByText(/AJVT-2026-0061/)).toBeNull();
  });

  it("is nobody when neither the payment nor the list carries an account id", () => {
    mockFetch([]);
    show({ id: "u1", kind: "MEMBERSHIP", amount: null, userId: undefined }, [NO_ACCOUNT_ID]);

    expect(screen.queryByText(/AJVT-2026-0061/)).toBeNull();
  });

  it("does not fall on the first of the list when a gift carries no account", () => {
    mockFetch([]);
    show({ userId: undefined }, [NO_ACCOUNT_ID, ACCOUNT]);

    expect(screen.queryByText(/AJVT-2026-0061/)).toBeNull();
  });
});
