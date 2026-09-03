import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DonationEditForm from "./DonationEditForm";
import { donationEdit } from "@/lib/texts";
import { money } from "@/lib/messages";
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

function proofOf(over: Partial<Proof> = {}): Proof {
  return {
    id: "d1",
    kind: "DONATION",
    proof: null,
    memberName: "أبوبكر لمرابط",
    activityTitle: null,
    amount: 2000,
    status: "ACTIVE",
    source: "PUBLIC",
    donorName: "ابو",
    donorPhone: null,
    donorPhoto: null,
    anonymous: false,
    uploadedAt: "2026-08-20T09:00:00.000Z",
    submittedAt: "2026-08-20T09:00:00.000Z",
    ...over,
  };
}

function mockPatch(donation: Record<string, unknown> = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      donation: {
        id: "d1",
        donorName: "أبوبكر",
        donorPhone: null,
        donorPhoto: null,
        amount: 2000,
        status: "ACTIVE",
        source: "PUBLIC",
        paymentMethod: null,
        proof: null,
        userId: "u1",
        anonymous: false,
        activityId: null,
        createdAt: "2026-08-20T09:00:00.000Z",
        updatedAt: "2026-08-20T09:00:00.000Z",
        ...donation,
      },
    }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function show(over: Partial<Proof> = {}, linkedMember: MemberOption | undefined = ACCOUNT) {
  const onSaved = vi.fn();
  const onRelink = vi.fn();
  render(
    <DonationEditForm
      proof={proofOf(over)}
      activities={[]}
      linkedMember={linkedMember}
      onCancel={vi.fn()}
      onRelink={onRelink}
      onSaved={onSaved}
    />,
  );
  return { onSaved, onRelink };
}

function bodyOf(fetchMock: ReturnType<typeof mockPatch>) {
  return JSON.parse(fetchMock.mock.calls[0][1].body);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("editing a support payment", () => {
  it("lets the name be corrected even though a member is linked", async () => {
    const fetchMock = mockPatch();
    show({ userId: "u1" });

    const field = screen.getByLabelText(donationEdit.donorName);
    await userEvent.clear(field);
    await userEvent.type(field, "أبوبكر");
    await userEvent.click(screen.getByText(donationEdit.save));

    expect(bodyOf(fetchMock).donorName).toBe("أبوبكر");
  });

  it("shows the account name as the one people will see", () => {
    show({ userId: "u1" });

    expect(screen.getByText(donationEdit.shownAs)).toBeTruthy();
    expect(screen.getAllByText("أبوبكر لمرابط").length).toBeGreaterThan(0);
  });

  it("asks for a name only when nothing is linked", async () => {
    mockPatch();
    show({ userId: null }, undefined);

    const field = screen.getByLabelText(donationEdit.donorName);
    await userEvent.clear(field);
    await userEvent.click(screen.getByText(donationEdit.save));

    expect(screen.getByText(money.nameRequired)).toBeTruthy();
  });

  it("keeps a linked payment saveable with no typed name at all", async () => {
    const fetchMock = mockPatch();
    show({ userId: "u1", donorName: null });

    await userEvent.click(screen.getByText(donationEdit.save));

    expect(bodyOf(fetchMock).donorName).toBeNull();
  });

  it("hides the giver behind فاعل خير once the toggle is on", async () => {
    mockPatch();
    show({ userId: "u1" });

    await userEvent.click(screen.getByLabelText(donationEdit.anonymous));

    expect(screen.getByText(money.anonymousDonor)).toBeTruthy();
  });

  it("sends the anonymity choice with the rest of the edit", async () => {
    const fetchMock = mockPatch();
    show({ userId: "u1" });

    await userEvent.click(screen.getByLabelText(donationEdit.anonymous));
    await userEvent.click(screen.getByText(donationEdit.save));

    expect(bodyOf(fetchMock).anonymous).toBe(true);
  });

  it("refuses an amount that is not a positive whole number", async () => {
    mockPatch();
    show({ userId: "u1" });

    const field = screen.getByLabelText(donationEdit.amount);
    await userEvent.clear(field);
    await userEvent.type(field, "0");
    await userEvent.click(screen.getByText(donationEdit.save));

    expect(screen.getByText(money.amountInvalid)).toBeTruthy();
  });

  it("opens the picker to change a link from inside the form", async () => {
    const { onRelink } = show({ userId: "u1" });

    await userEvent.click(screen.getByText(donationEdit.changeLink));

    expect(onRelink).toHaveBeenCalled();
  });

  it("shows who the payment is linked to, not just their name", () => {
    show({ userId: "u1" });

    expect(screen.getByText(/AJVT-2026-0061/)).toBeTruthy();
  });
});
