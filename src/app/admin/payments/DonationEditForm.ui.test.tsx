import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DonationEditForm from "./DonationEditForm";
import {
  bankReference,
  donationEdit,
  manualDonation,
  memberPicker,
  paymentAccountPicker,
} from "@/lib/texts";
import { money } from "@/lib/messages";
import type { MemberOption, Proof } from "./paymentTypes";
import { answering, sentBody } from "@tests/ui/paymentMethods";

const RETIRED = "طريقة قديمة";

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
    paidOn: "2026-08-18T12:00:00.000Z",
    submittedAt: "2026-08-20T09:00:00.000Z",
    ...over,
  };
}

function mockPatch(donation: Record<string, unknown> = {}) {
  const fetchMock = vi.fn(
    answering(async () => ({
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
    })),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const SECOND: MemberOption = {
  ...ACCOUNT,
  id: "m2",
  userId: "u2",
  fullName: "الداه الحسن",
  memberNumber: "AJVT-2026-0062",
};

function show(over: Partial<Proof> = {}, linkedMember: MemberOption | undefined = ACCOUNT) {
  const onSaved = vi.fn();
  const onLink = vi.fn();
  render(
    <DonationEditForm
      proof={proofOf(over)}
      destinations={[]}
      linkedMember={linkedMember}
      members={[ACCOUNT, SECOND]}
      busy={false}
      onCancel={vi.fn()}
      onLink={onLink}
      onSaved={onSaved}
    />,
  );
  return { onSaved, onLink };
}

function bodyOf(fetchMock: ReturnType<typeof mockPatch>) {
  return sentBody(fetchMock.mock.calls);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("editing a support payment", () => {
  it("asks for no name and no phone once a member is linked", () => {
    show({ userId: "u1" });

    expect(screen.queryByLabelText(donationEdit.donorName)).toBeNull();
    expect(screen.queryByLabelText(donationEdit.phone)).toBeNull();
    expect(screen.getByText(donationEdit.contactFromAccount)).toBeTruthy();
  });

  it("sends neither of them when saving a linked payment", async () => {
    const fetchMock = mockPatch();
    show({ userId: "u1" });

    await userEvent.click(screen.getByText(donationEdit.save));

    const body = bodyOf(fetchMock);
    expect(body).not.toHaveProperty("donorName");
    expect(body).not.toHaveProperty("donorPhone");
  });

  it("still asks for a name and a phone when nothing is linked", () => {
    show({ userId: null }, undefined);

    expect(screen.getByLabelText(donationEdit.donorName)).toBeTruthy();
    expect(screen.getByLabelText(donationEdit.phone)).toBeTruthy();
    expect(screen.queryByText(donationEdit.contactFromAccount)).toBeNull();
  });

  it("shows the account name as the one people will see", () => {
    show({ userId: "u1" });

    expect(screen.getByText(donationEdit.shownAs)).toBeTruthy();
    expect(screen.getAllByText("أبوبكر لمرابط").length).toBeGreaterThan(0);
  });

  it("records a donation whose giver is not known, with no name at all", async () => {
    const fetchMock = mockPatch();
    show({ userId: null }, undefined);

    const field = screen.getByLabelText(donationEdit.donorName);
    await userEvent.clear(field);
    await userEvent.click(screen.getByText(donationEdit.save));

    await waitFor(() => expect(bodyOf(fetchMock).donorName).toBeNull());
  });

  it("refuses the display constant typed in as a name", async () => {
    mockPatch();
    show({ userId: null }, undefined);

    const field = screen.getByLabelText(donationEdit.donorName);
    await userEvent.clear(field);
    await userEvent.type(field, money.anonymousDonor);
    await userEvent.click(screen.getByText(donationEdit.save));

    expect(screen.getByText(money.nameIsThePlaceholder)).toBeTruthy();
  });

  it("keeps a linked payment saveable with no typed name at all", async () => {
    const fetchMock = mockPatch();
    show({ userId: "u1", donorName: null });

    await userEvent.click(screen.getByText(donationEdit.save));

    expect(bodyOf(fetchMock).amount).toBe(2000);
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

  it("opens the picker inside the form and keeps what was typed", async () => {
    show({ userId: "u1" });

    const amount = screen.getByLabelText(donationEdit.amount);
    await userEvent.clear(amount);
    await userEvent.type(amount, "4500");
    await userEvent.click(screen.getByText(donationEdit.changeLink));

    expect(screen.getByPlaceholderText(memberPicker.search)).toBeDefined();
    expect((screen.getByLabelText(donationEdit.amount) as HTMLInputElement).value).toBe("4500");
  });

  it("links the member picked and returns to the form still holding the edit", async () => {
    const { onLink } = show({ userId: "u1" });

    const amount = screen.getByLabelText(donationEdit.amount);
    await userEvent.clear(amount);
    await userEvent.type(amount, "4500");
    await userEvent.click(screen.getByText(donationEdit.changeLink));
    await userEvent.type(screen.getByPlaceholderText(memberPicker.search), "الداه");
    await userEvent.click(screen.getByText("الداه الحسن"));

    expect(onLink).toHaveBeenCalledWith("u2");
    expect(screen.queryByPlaceholderText(memberPicker.search)).toBeNull();
    expect((screen.getByLabelText(donationEdit.amount) as HTMLInputElement).value).toBe("4500");
  });

  it("saves nothing of its own when a member is picked", async () => {
    const fetchMock = mockPatch();
    show({ userId: "u1" });

    await userEvent.click(screen.getByText(donationEdit.changeLink));
    await userEvent.type(screen.getByPlaceholderText(memberPicker.search), "الداه");
    await userEvent.click(screen.getByText("الداه الحسن"));

    const wrote = fetchMock.mock.calls.some(([url]) =>
      String(url).startsWith("/api/admin/donations/"),
    );
    expect(wrote).toBe(false);
  });

  it("closes the picker again when the link button is pressed twice", async () => {
    show({ userId: "u1" });

    await userEvent.click(screen.getByText(donationEdit.changeLink));
    await userEvent.click(screen.getByText(donationEdit.changeLink));

    expect(screen.queryByPlaceholderText(memberPicker.search)).toBeNull();
  });

  it("shows who the payment is linked to, not just their name", () => {
    show({ userId: "u1" });

    expect(screen.getByText(/AJVT-2026-0061/)).toBeTruthy();
  });
});

describe("what the fields of the donation form are called", () => {
  it("names every one of them, filled or empty", async () => {
    mockPatch();
    show({ userId: null, paymentMethod: "بنكيلي" }, undefined);

    await screen.findByLabelText(paymentAccountPicker.label);
    for (const label of [
      donationEdit.donorName,
      donationEdit.phone,
      donationEdit.amount,
      donationEdit.paymentMethod,
      paymentAccountPicker.label,
      bankReference.label,
      donationEdit.destination,
      donationEdit.anonymous,
    ]) {
      expect(screen.getByLabelText(label)).toBeDefined();
    }
  });

  it("calls a field the same thing the create dialog calls it", () => {
    expect(donationEdit.donorName).toBe(manualDonation.donorName);
    expect(donationEdit.phone).toBe(manualDonation.phone);
    expect(donationEdit.amount).toBe(manualDonation.amount);
    expect(donationEdit.paymentMethod).toBe(manualDonation.paymentMethod);
    expect(donationEdit.destination).toBe(manualDonation.destination);
    expect(donationEdit.anonymous).toBe(manualDonation.anonymous);
  });
});

describe("a method that is no longer offered", () => {
  it("stays on the record an admin is editing", async () => {
    mockPatch();
    show({ paymentMethod: RETIRED });

    const select = await screen.findByLabelText(donationEdit.paymentMethod);
    expect(within(select).getByText(RETIRED)).toBeDefined();
    expect((select as HTMLSelectElement).value).toBe(RETIRED);
  });
});

describe("the number a payment landed in", () => {
  it("is offered for a method that receives into one", async () => {
    mockPatch();
    show({ paymentMethod: "بنكيلي" });

    const picker = await screen.findByLabelText(paymentAccountPicker.label);
    expect(within(picker).getByText("111111")).toBeDefined();
  });

  it("is not offered at all for a method that receives into none", async () => {
    mockPatch();
    show({ paymentMethod: "نقداً" });

    await screen.findByLabelText(donationEdit.paymentMethod);
    expect(screen.queryByLabelText(paymentAccountPicker.label)).toBeNull();
  });

  it("may be left unknown, which is a value rather than a gap", async () => {
    mockPatch();
    show({ paymentMethod: "بنكيلي" });

    const picker = (await screen.findByLabelText(paymentAccountPicker.label)) as HTMLSelectElement;
    expect(within(picker).getByText(paymentAccountPicker.unknown)).toBeDefined();
    expect(picker.value).toBe("");
  });

  it("offers each number when a method receives into several", async () => {
    mockPatch();
    show({ paymentMethod: "السداد" });

    const picker = await screen.findByLabelText(paymentAccountPicker.label);
    expect(within(picker).getByText("222222")).toBeDefined();
    expect(within(picker).getByText("444444")).toBeDefined();
  });

  it("keeps the number a record already points at, even a closed one", async () => {
    mockPatch();
    render(
      <DonationEditForm
        proof={{
          ...proofOf({ paymentMethod: "بنكيلي" }),
          accountId: "old",
          account: { id: "old", code: "999999", label: null },
        }}
        destinations={[]}
        linkedMember={ACCOUNT}
        members={[ACCOUNT]}
        busy={false}
        onCancel={vi.fn()}
        onLink={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    const picker = (await screen.findByLabelText(paymentAccountPicker.label)) as HTMLSelectElement;
    expect(within(picker).getByText("999999")).toBeDefined();
    expect(picker.value).toBe("old");
  });

  it("clears the number when the method changes under it", async () => {
    mockPatch();
    show({ paymentMethod: "بنكيلي" });

    const picker = (await screen.findByLabelText(paymentAccountPicker.label)) as HTMLSelectElement;
    fireEvent.change(picker, { target: { value: "a1" } });
    expect(picker.value).toBe("a1");

    fireEvent.change(screen.getByLabelText(donationEdit.paymentMethod), {
      target: { value: "مصرفي" },
    });

    expect((screen.getByLabelText(paymentAccountPicker.label) as HTMLSelectElement).value).toBe("");
  });

  it("sends the number it was left with", async () => {
    const fetchMock = mockPatch();
    show({ paymentMethod: "بنكيلي" });

    fireEvent.change(await screen.findByLabelText(paymentAccountPicker.label), {
      target: { value: "a1" },
    });
    fireEvent.click(screen.getByRole("button", { name: donationEdit.save }));

    await waitFor(() => expect(bodyOf(fetchMock).accountId).toBe("a1"));
  });
});

describe("the bank's own transaction number", () => {
  it("is offered on the record an admin is reviewing", async () => {
    mockPatch();
    show({ paymentMethod: "بنكيلي" });

    expect(await screen.findByLabelText(bankReference.label)).toBeDefined();
  });

  it("opens on the one already recorded", async () => {
    mockPatch();
    show({ paymentMethod: "بنكيلي", bankReference: "TR10000000001" });

    const field = (await screen.findByLabelText(bankReference.label)) as HTMLInputElement;
    expect(field.value).toBe("TR10000000001");
  });

  it("says nothing when the number is the only one recorded", async () => {
    mockPatch();
    show({ paymentMethod: "بنكيلي", bankReference: "TR10000000001" });

    await screen.findByLabelText(bankReference.label);
    expect(screen.queryByText(bankReference.repeated)).toBeNull();
  });

  it("says so when the same number is already on another record", async () => {
    mockPatch();
    show({ paymentMethod: "بنكيلي", bankReference: "TR10000000001", repeatedReference: true });

    expect(await screen.findByText(bankReference.repeated)).toBeDefined();
  });

  it("still saves while it is saying so, since a repeat may be a correction", async () => {
    const fetchMock = mockPatch();
    show({ paymentMethod: "بنكيلي", bankReference: "TR10000000001", repeatedReference: true });

    await screen.findByText(bankReference.repeated);
    fireEvent.click(screen.getByRole("button", { name: donationEdit.save }));

    await waitFor(() => expect(bodyOf(fetchMock).bankReference).toBe("TR10000000001"));
  });

  it("sends the number an admin typed", async () => {
    const fetchMock = mockPatch();
    show({ paymentMethod: "بنكيلي" });

    fireEvent.change(await screen.findByLabelText(bankReference.label), {
      target: { value: "REF100000001" },
    });
    fireEvent.click(screen.getByRole("button", { name: donationEdit.save }));

    await waitFor(() => expect(bodyOf(fetchMock).bankReference).toBe("REF100000001"));
  });
});
