import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import StepPayment from "./StepPayment";
import type { PaymentValues } from "./constants";
import { stepPayment } from "@/lib/texts";

const NEW_METHOD = "خدمة جديدة";

function offering(methods: { name: string; memberFacing: boolean; accounts: unknown[] }[]) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ methods }),
  })) as unknown as typeof fetch;
}

function formOf(over: Partial<PaymentValues> = {}): PaymentValues {
  return { paymentMethod: "", accountId: "", paidAmount: "", referenceCode: "", ...over };
}

function renderStep(form: PaymentValues = formOf(), setForm = vi.fn()) {
  render(
    <StepPayment
      form={form}
      setForm={setForm}
      fullName="محمد ولد أحمد"
      membershipFee={2000}
      copied={null}
      onCopy={vi.fn()}
      surplus={0}
      wantsName={null}
      setWantsName={vi.fn()}
      proofFilename={null}
      setProofFilename={vi.fn()}
      setProofUploading={vi.fn()}
      error=""
      loading={false}
      proofUploading={false}
      editing={false}
      onSubmit={vi.fn()}
    />,
  );
}

describe("the methods the payment step offers a member", () => {
  beforeEach(() => {
    globalThis.fetch = offering([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("offers nothing before the answer arrives", () => {
    renderStep();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  it("does not offer a method that has no account", async () => {
    globalThis.fetch = offering([{ name: NEW_METHOD, memberFacing: true, accounts: [] }]);
    renderStep();
    await waitFor(() => expect(screen.queryByText(NEW_METHOD)).toBeNull());
  });

  it("offers the same method once it has one", async () => {
    globalThis.fetch = offering([
      {
        name: NEW_METHOD,
        memberFacing: true,
        accounts: [{ id: "a1", code: "111111", label: null }],
      },
    ]);
    renderStep();
    await waitFor(() => expect(screen.getByText(NEW_METHOD)).toBeDefined());
  });

  it("never offers an admin only method, however many accounts it has", async () => {
    globalThis.fetch = offering([
      {
        name: NEW_METHOD,
        memberFacing: false,
        accounts: [{ id: "a1", code: "111111", label: null }],
      },
    ]);
    renderStep();
    await waitFor(() => expect(screen.queryByText(NEW_METHOD)).toBeNull());
  });
});

const TWO_ACCOUNTS = [
  { id: "a1", code: "111111", label: null },
  { id: "a2", code: "222222", label: null },
];

describe("the account a member says they paid into", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("asks nothing when the method receives into one number", async () => {
    globalThis.fetch = offering([
      { name: NEW_METHOD, memberFacing: true, accounts: [TWO_ACCOUNTS[0]] },
    ]);
    renderStep(formOf({ paymentMethod: NEW_METHOD }));

    await waitFor(() => expect(screen.getByText("111111")).toBeDefined());
    expect(screen.queryByText(stepPayment.accountLabel)).toBeNull();
  });

  it("asks which number when the method receives into several", async () => {
    globalThis.fetch = offering([{ name: NEW_METHOD, memberFacing: true, accounts: TWO_ACCOUNTS }]);
    renderStep(formOf({ paymentMethod: NEW_METHOD }));

    await waitFor(() => expect(screen.getByText(stepPayment.accountLabel)).toBeDefined());
    expect(screen.getAllByRole("radio", { name: /111111|222222/ })).toHaveLength(2);
  });

  it("shows no number to copy until one is picked", async () => {
    globalThis.fetch = offering([{ name: NEW_METHOD, memberFacing: true, accounts: TWO_ACCOUNTS }]);
    renderStep(formOf({ paymentMethod: NEW_METHOD }));

    await waitFor(() => expect(screen.getByText(stepPayment.accountLabel)).toBeDefined());
    expect(screen.queryByText(stepPayment.receivingNumber)).toBeNull();
  });

  it("copies the number that was picked", async () => {
    globalThis.fetch = offering([{ name: NEW_METHOD, memberFacing: true, accounts: TWO_ACCOUNTS }]);
    renderStep(formOf({ paymentMethod: NEW_METHOD, accountId: "a2" }));

    await waitFor(() => expect(screen.getByText(stepPayment.receivingNumber)).toBeDefined());
    expect(screen.getAllByText("222222").length).toBeGreaterThan(0);
  });

  it("reports the number the member picked", async () => {
    globalThis.fetch = offering([{ name: NEW_METHOD, memberFacing: true, accounts: TWO_ACCOUNTS }]);
    const setForm = vi.fn();
    renderStep(formOf({ paymentMethod: NEW_METHOD }), setForm);

    await waitFor(() => expect(screen.getByText(stepPayment.accountLabel)).toBeDefined());
    fireEvent.click(screen.getByRole("radio", { name: "222222" }));

    const update = setForm.mock.calls[0][0] as (p: PaymentValues) => PaymentValues;
    expect(update(formOf()).accountId).toBe("a2");
  });
});
