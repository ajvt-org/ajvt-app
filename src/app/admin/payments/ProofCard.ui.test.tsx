import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProofCard from "./ProofCard";
import {
  deleteMember,
  donationActions,
  donationEdit,
  memberDecision,
  paymentCard,
  proofReuse,
} from "@/lib/texts";
import { money } from "@/lib/money";
import { formatDate } from "@/lib/utils";
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
    paidOn: "2026-08-18T12:00:00.000Z",
    submittedAt: "2026-08-20T09:00:00.000Z",
    ...over,
  };
}

function show(over: Partial<Proof> = {}, members: MemberOption[] = []) {
  return render(
    <ProofCard
      proof={proofOf(over)}
      members={members}
      destinations={[]}
      financeTags={[]}
      busy={false}
      error=""
      onReview={vi.fn()}
      onDelete={vi.fn()}
      onLink={vi.fn()}
      onPatch={vi.fn()}
      onMembershipChanged={vi.fn()}
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

    const warning = await screen.findByText(new RegExp(proofReuse.title));
    await userEvent.click(warning.closest("button")!);

    expect(screen.getByText("أحمد")).toBeTruthy();
  });

  it("keeps the earlier uses folded away until they are asked for", async () => {
    mockFetch();
    show();

    const warning = await screen.findByText(new RegExp(proofReuse.title));
    const control = warning.closest("button")!;

    expect(control.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("أحمد")).toBeNull();
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
    expect(container.textContent).not.toContain(paymentCard.statusPending);
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

  it("names the quiz a gift was aimed at", () => {
    mockFetch([]);
    show({ competitionId: "c1", competitionName: "مسابقة رمضان" });

    expect(screen.getByText("مسابقة رمضان")).toBeTruthy();
    expect(screen.queryByText(paymentCard.generalSupport)).toBeNull();
  });

  it("names the activity ahead of anything else when one is set", () => {
    mockFetch([]);
    show({ activityTitle: "الدوري", competitionId: null, competitionName: null });

    expect(screen.getByText("الدوري")).toBeTruthy();
  });

  it("falls back to general support when the gift is aimed nowhere", () => {
    mockFetch([]);
    show({ activityTitle: null, competitionName: null });

    expect(screen.getByText(paymentCard.generalSupport)).toBeTruthy();
  });

  it("says when a gift is hidden from the public board", () => {
    mockFetch([]);
    show({ anonymous: true });

    expect(screen.getByLabelText(paymentCard.hiddenOnBoard)).toBeTruthy();
  });

  it("says nothing about hiding a gift that is named", () => {
    mockFetch([]);
    show({ anonymous: false });

    expect(screen.queryByLabelText(paymentCard.hiddenOnBoard)).toBeNull();
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

describe("the payer on a card linked to an account", () => {
  it("prints the name once", () => {
    mockFetch([]);
    show({ memberName: "أبوبكر لمرابط", userId: "u1" }, [ACCOUNT]);

    expect(screen.getAllByText("أبوبكر لمرابط")).toHaveLength(1);
  });

  it("keeps on the identity line what the name alone does not say", () => {
    mockFetch([]);
    show({ memberName: "أبوبكر لمرابط", userId: "u1" }, [ACCOUNT]);

    expect(screen.getByText(/AJVT-2026-0061/)).toBeTruthy();
    expect(screen.getByText(/التاكلالت/)).toBeTruthy();
  });
});

describe("the order a list of payments reads in", () => {
  it("puts the origin and the date above the quieter lines", () => {
    mockFetch([]);
    const { container } = show({
      userId: "u1",
      receipt: { number: "R-2026-0243", status: "ACTIVE" },
    });
    const text = container.textContent!;

    expect(text.indexOf(paymentCard.statusPending)).toBeLessThan(
      text.indexOf(paymentCard.generalSupport),
    );
    expect(text.indexOf(paymentCard.generalSupport)).toBeLessThan(
      text.indexOf(formatDate("2026-08-18T12:00:00.000Z")),
    );
    expect(text.indexOf(formatDate("2026-08-18T12:00:00.000Z"))).toBeLessThan(
      text.indexOf("R-2026-0243"),
    );
  });
});

describe("a membership payment carries its own controls", () => {
  const membership = { kind: "MEMBERSHIP" as const, id: "u1", userId: "u1", amount: null };

  it("offers accepting, refusing, replacing the proof and deleting the payment", () => {
    mockFetch([]);
    show(membership);

    expect(screen.getByRole("button", { name: new RegExp(memberDecision.accept) })).toBeTruthy();
    expect(screen.getByRole("button", { name: new RegExp(memberDecision.refuse) })).toBeTruthy();
    expect(screen.getByRole("button", { name: /استبدال الإثبات|إضافة إثبات/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: new RegExp(deleteMember.payment) })).toBeTruthy();
  });

  it("turns the verdict into undoing it once the payment is accepted", () => {
    mockFetch([]);
    show({ ...membership, status: "ACTIVE" });

    expect(screen.queryByRole("button", { name: memberDecision.accept })).toBeNull();
    expect(screen.queryByRole("button", { name: memberDecision.refuse })).toBeNull();
    expect(screen.getByRole("button", { name: memberDecision.revoke })).toBeTruthy();
  });

  it("offers none of it on a donation", () => {
    mockFetch([]);
    show();

    expect(screen.queryByRole("button", { name: new RegExp(deleteMember.payment) })).toBeNull();
  });

  it("reads from the decision on the proof towards the deletion of the payment", () => {
    mockFetch([]);
    show(membership);

    const accept = screen.getByRole("button", { name: new RegExp(memberDecision.accept) });
    const refuse = screen.getByRole("button", { name: new RegExp(memberDecision.refuse) });
    const remove = screen.getByRole("button", { name: new RegExp(deleteMember.payment) });
    expect(accept.compareDocumentPosition(refuse) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(refuse.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps the deletion out of the group the decisions sit in", () => {
    mockFetch([]);
    show(membership);

    const accept = screen.getByRole("button", { name: new RegExp(memberDecision.accept) });
    const remove = screen.getByRole("button", { name: new RegExp(deleteMember.payment) });
    expect(accept.parentElement!.contains(remove)).toBe(false);
  });
});

describe("what a donation opens inside its own card", () => {
  const TAGS = [{ id: "t1", name: "زكاة" }];

  it("reads its classification with the facts rather than above the actions", () => {
    mockFetch([]);
    show({ tags: TAGS });

    const tag = screen.getByText("زكاة");
    const accept = screen.getByRole("button", { name: new RegExp(donationActions.accept) });
    expect(tag.compareDocumentPosition(accept) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("prints no line about a classification a donation does not carry", () => {
    mockFetch([]);
    const { container } = show();

    expect(container.querySelector(".expense-tag")).toBeNull();
    expect(screen.getByRole("button", { name: new RegExp(donationActions.classify) })).toBeTruthy();
  });

  it("opens the classification under the actions, which stay where they are", async () => {
    mockFetch([]);
    show({ tags: TAGS });

    await userEvent.click(
      screen.getByRole("button", { name: new RegExp(donationActions.classify) }),
    );

    const accept = screen.getByRole("button", { name: new RegExp(donationActions.accept) });
    const save = screen.getByRole("button", { name: donationEdit.save });
    expect(accept.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("leaves the actions in place when the edit form opens", async () => {
    mockFetch([]);
    show();

    await userEvent.click(screen.getByRole("button", { name: new RegExp(donationActions.edit) }));

    const accept = screen.getByRole("button", { name: new RegExp(donationActions.accept) });
    const shownAs = screen.getByText(donationEdit.shownAs);
    expect(accept.compareDocumentPosition(shownAs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("holds one panel open at a time", async () => {
    mockFetch([]);
    show({ tags: TAGS });

    await userEvent.click(screen.getByRole("button", { name: new RegExp(donationActions.edit) }));
    await userEvent.click(
      screen.getByRole("button", { name: new RegExp(donationActions.classify) }),
    );

    expect(screen.queryByText(donationEdit.shownAs)).toBeNull();
  });

  it("keeps deleting a donation out of the group holding the routine verbs", () => {
    mockFetch([]);
    show({ status: "ACTIVE" });

    const edit = screen.getByRole("button", { name: new RegExp(donationActions.edit) });
    const remove = screen.getByRole("button", { name: new RegExp(donationActions.remove) });
    const revoke = screen.getByRole("button", { name: new RegExp(donationActions.revoke) });
    expect(edit.parentElement!.contains(remove)).toBe(false);
    expect(remove.parentElement!.contains(revoke)).toBe(true);
  });

  it("severs a donation from an account alongside the other verbs that undo something", () => {
    mockFetch([]);
    show({ userId: "u1" }, [ACCOUNT]);

    const unlink = screen.getByRole("button", { name: donationEdit.unlink });
    const remove = screen.getByRole("button", { name: new RegExp(donationActions.remove) });
    const change = screen.getByRole("button", { name: donationEdit.changeLink });
    expect(unlink.parentElement!.contains(remove)).toBe(true);
    expect(unlink.parentElement!.contains(change)).toBe(false);
  });

  it("draws changing the link and severing it on two different icons", () => {
    mockFetch([]);
    show({ userId: "u1" }, [ACCOUNT]);

    const unlink = screen.getByRole("button", { name: donationEdit.unlink });
    const change = screen.getByRole("button", { name: donationEdit.changeLink });
    expect(unlink.querySelector("path")!.getAttribute("d")).not.toBe(
      change.querySelector("path")!.getAttribute("d"),
    );
  });

  it("offers no severing on a donation that belongs to nobody", () => {
    mockFetch([]);
    show();

    expect(screen.queryByRole("button", { name: donationEdit.unlink })).toBeNull();
    expect(screen.getByRole("button", { name: donationEdit.link })).toBeTruthy();
  });

  it("keeps the record folded away until it is asked for", async () => {
    mockFetch([]);
    show();

    const history = screen.getByRole("button", { name: new RegExp(paymentCard.history) });
    expect(history.getAttribute("aria-expanded")).toBe("false");

    await userEvent.click(history);

    expect(history.getAttribute("aria-expanded")).toBe("true");
  });
});
