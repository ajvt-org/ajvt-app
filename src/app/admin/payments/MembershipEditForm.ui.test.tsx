import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MembershipEditForm from "./MembershipEditForm";
import { bankReference, membershipEdit, paymentAccountPicker } from "@/lib/texts";
import type { Proof } from "./paymentTypes";
import { answering, sentBody } from "@tests/ui/paymentMethods";

function proofOf(over: Partial<Proof> = {}): Proof {
  return {
    id: "u1",
    kind: "MEMBERSHIP",
    proof: "proof.webp",
    memberName: "محمد ولد أحمد",
    activityTitle: null,
    amount: 2000,
    status: "ACTIVE",
    paymentMethod: "بنكيلي",
    accountId: "a1",
    account: { id: "a1", code: "111111", label: null },
    bankReference: "REF-1",
    userId: "u1",
    paidOn: "2026-08-18T12:00:00.000Z",
    submittedAt: "2026-08-20T09:00:00.000Z",
    ...over,
  };
}

function mockPut() {
  const fetchMock = vi.fn(
    answering(async () => ({ ok: true, status: 200, json: async () => ({}) })),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function setup(over: Partial<Proof> = {}) {
  const onSaved = vi.fn();
  const onCancel = vi.fn();
  render(<MembershipEditForm proof={proofOf(over)} onSaved={onSaved} onCancel={onCancel} />);
  return { onSaved, onCancel };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("editing a membership payment", () => {
  it("opens on what the payment already holds", async () => {
    mockPut();
    setup();

    expect((screen.getByLabelText(membershipEdit.amount) as HTMLInputElement).value).toBe("2000");
    expect((screen.getByLabelText(membershipEdit.paidOn) as HTMLInputElement).value).toBe(
      "2026-08-18T12:00",
    );
    expect((screen.getByLabelText(bankReference.label) as HTMLInputElement).value).toBe("REF-1");
    await waitFor(() =>
      expect((screen.getByLabelText(membershipEdit.paymentMethod) as HTMLSelectElement).value).toBe(
        "بنكيلي",
      ),
    );
  });

  it("saves the corrected amount on the payment", async () => {
    const fetchMock = mockPut();
    const { onSaved } = setup();

    const amount = screen.getByLabelText(membershipEdit.amount);
    await userEvent.clear(amount);
    await userEvent.type(amount, "3000");
    await userEvent.click(screen.getByRole("button", { name: membershipEdit.save }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const call = fetchMock.mock.calls.find((c) => c[1]?.method === "PUT");
    expect(call?.[0]).toBe("/api/admin/members/u1/payment");
    expect(sentBody(fetchMock.mock.calls)).toMatchObject({
      amountTransferred: 3000,
      paymentMethod: "بنكيلي",
      accountId: "a1",
      bankReference: "REF-1",
      paidOn: "2026-08-18T12:00",
    });
  });

  it("refuses an empty amount rather than deleting the payment", async () => {
    const fetchMock = mockPut();
    setup();

    await userEvent.clear(screen.getByLabelText(membershipEdit.amount));
    await userEvent.click(screen.getByRole("button", { name: membershipEdit.save }));

    expect(screen.getByText(membershipEdit.amountRequired)).toBeDefined();
    expect(fetchMock.mock.calls.some((c) => c[1]?.method === "PUT")).toBe(false);
  });

  it("refuses an amount below the membership fee", async () => {
    const fetchMock = mockPut();
    setup();

    const amount = screen.getByLabelText(membershipEdit.amount);
    await userEvent.clear(amount);
    await userEvent.type(amount, "10");
    await userEvent.click(screen.getByRole("button", { name: membershipEdit.save }));

    expect(fetchMock.mock.calls.some((c) => c[1]?.method === "PUT")).toBe(false);
  });

  it("offers the numbers of the method the payment holds", async () => {
    mockPut();
    setup();

    const picker = await screen.findByLabelText(paymentAccountPicker.label);
    expect(within(picker).getByText("111111")).toBeDefined();
  });

  it("keeps a closed number the payment already points at", async () => {
    mockPut();
    setup({ accountId: "old", account: { id: "old", code: "999999", label: null } });

    const picker = (await screen.findByLabelText(paymentAccountPicker.label)) as HTMLSelectElement;
    expect(within(picker).getByText("999999")).toBeDefined();
  });

  it("clears the number when the method changes", async () => {
    const fetchMock = mockPut();
    const { onSaved } = setup();
    await waitFor(() =>
      expect((screen.getByLabelText(membershipEdit.paymentMethod) as HTMLSelectElement).value).toBe(
        "بنكيلي",
      ),
    );

    await userEvent.selectOptions(screen.getByLabelText(membershipEdit.paymentMethod), "السداد");
    await userEvent.click(screen.getByRole("button", { name: membershipEdit.save }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(sentBody(fetchMock.mock.calls)).toMatchObject({
      paymentMethod: "السداد",
      accountId: null,
    });
  });
});

describe("the date on a membership payment", () => {
  it("asks for the hour the money moved", () => {
    mockPut();
    setup();

    const field = screen.getByLabelText(membershipEdit.paidOn) as HTMLInputElement;

    expect(field.type).toBe("datetime-local");
    expect(field.value).toBe("2026-08-18T12:00");
  });
});
