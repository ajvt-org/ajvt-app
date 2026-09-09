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
  return {
    paymentMethod: "",
    accountId: "",
    bankReference: "",
    paidAmount: "",
    referenceCode: "",
    ...over,
  };
}

function renderStep(form: PaymentValues = formOf(), setForm = vi.fn(), asksBankReference = true) {
  render(
    <StepPayment
      form={form}
      setForm={setForm}
      fullName="محمد ولد أحمد"
      membershipFee={2000}
      asksBankReference={asksBankReference}
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
      reference={{ label: stepPayment.orderCode, value: form.referenceCode }}
      submitLabel={stepPayment.send}
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

  it("reports the only number without asking the member to pick it", async () => {
    globalThis.fetch = offering([
      { name: NEW_METHOD, memberFacing: true, accounts: [TWO_ACCOUNTS[0]] },
    ]);
    const setForm = vi.fn();
    renderStep(formOf({ paymentMethod: NEW_METHOD }), setForm);

    await waitFor(() => expect(setForm).toHaveBeenCalled());
    const update = setForm.mock.calls[0][0] as (p: PaymentValues) => PaymentValues;
    expect(update(formOf({ paymentMethod: NEW_METHOD })).accountId).toBe("a1");
  });

  it("leaves a number the member already holds alone", async () => {
    globalThis.fetch = offering([{ name: NEW_METHOD, memberFacing: true, accounts: TWO_ACCOUNTS }]);
    const setForm = vi.fn();
    renderStep(formOf({ paymentMethod: NEW_METHOD, accountId: "a2" }), setForm);

    await waitFor(() => expect(screen.getByText(stepPayment.receivingNumber)).toBeDefined());
    expect(setForm).not.toHaveBeenCalled();
  });

  it("keeps a number that is no longer offered rather than dropping it", async () => {
    globalThis.fetch = offering([
      { name: NEW_METHOD, memberFacing: true, accounts: [TWO_ACCOUNTS[0]] },
    ]);
    const setForm = vi.fn();
    renderStep(formOf({ paymentMethod: NEW_METHOD, accountId: "gone" }), setForm);

    await waitFor(() => expect(screen.getByText(NEW_METHOD)).toBeDefined());
    expect(setForm).not.toHaveBeenCalled();
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

describe("the transaction number a member copies off their receipt", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is offered with nothing written under it", async () => {
    globalThis.fetch = offering([]);
    renderStep();

    const input = document.querySelector("#member-bank-reference") as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.nextElementSibling).toBeNull();
  });

  it("says nothing about what was typed into it", async () => {
    globalThis.fetch = offering([]);
    renderStep(formOf({ bankReference: "AJV-EG8A6" }));

    const input = document.querySelector("#member-bank-reference") as HTMLInputElement;
    expect(input.parentElement?.querySelectorAll("p")).toHaveLength(0);
  });

  it("still lets the request be sent, since it is only a note", async () => {
    globalThis.fetch = offering([]);
    const onSubmit = vi.fn();
    render(
      <StepPayment
        form={formOf({ bankReference: "AJV-EG8A6" })}
        setForm={vi.fn()}
        fullName="محمد ولد أحمد"
        membershipFee={2000}
        asksBankReference
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
        reference={{ label: stepPayment.orderCode, value: "ABC123" }}
        submitLabel={stepPayment.send}
        onSubmit={onSubmit}
      />,
    );

    expect(
      (screen.getByRole("button", { name: new RegExp(stepPayment.send) }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});

describe("whether the انتساب form asks for a transaction number", () => {
  beforeEach(() => {
    globalThis.fetch = offering([]);
  });

  it("asks for it where the association wants it", () => {
    renderStep(formOf(), vi.fn(), true);

    expect(screen.getByLabelText(stepPayment.bankReference)).toBeDefined();
  });

  it("takes the label and the input together where it does not", () => {
    renderStep(formOf(), vi.fn(), false);

    expect(screen.queryByLabelText(stepPayment.bankReference)).toBeNull();
    expect(document.querySelector("#member-bank-reference")).toBeNull();
  });

  it("still asks for the amount and still submits", () => {
    renderStep(formOf(), vi.fn(), false);

    expect(document.querySelector("#member-paid")).not.toBeNull();
    expect(screen.getByRole("button", { name: stepPayment.send })).toBeDefined();
  });
});

describe("the reference row in the transfer panel", () => {
  beforeEach(() => {
    globalThis.fetch = offering([
      { name: "بنكيلي", memberFacing: true, accounts: [{ id: "a1", code: "22200000", label: "" }] },
    ]);
  });

  it("shows the row the page hands it", async () => {
    renderStep(formOf({ paymentMethod: "بنكيلي" }));

    expect(await screen.findByText(stepPayment.orderCode)).toBeDefined();
  });

  it("draws a finished panel with no row to show", async () => {
    render(
      <StepPayment
        form={formOf({ paymentMethod: "بنكيلي" })}
        setForm={vi.fn()}
        fullName="محمد ولد أحمد"
        membershipFee={2000}
        asksBankReference={false}
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
        reference={null}
        submitLabel={stepPayment.send}
        onSubmit={vi.fn()}
      />,
    );

    expect(await screen.findByText(stepPayment.amount)).toBeDefined();
    expect(screen.queryByText(stepPayment.orderCode)).toBeNull();
    expect(screen.queryByText(stepPayment.memberCode)).toBeNull();
  });
});

describe("what the payment step says about the fee", () => {
  it("takes the amount from the setting rather than from a constant", async () => {
    globalThis.fetch = offering([
      { name: "بنكيلي", memberFacing: true, accounts: [{ id: "a1", code: "22200000", label: "" }] },
    ]);
    renderStep(formOf({ paymentMethod: "بنكيلي" }));

    await screen.findByText(stepPayment.receivingNumber);
    const paid = document.querySelector("#member-paid") as HTMLInputElement;
    expect(paid.min).toBe("2000");
    expect(paid.placeholder).toBe("2000");
    expect(document.body.textContent).toContain(stepPayment.payAtLeast(2000));
  });

  it("says nothing under the amount that the panel already says", () => {
    globalThis.fetch = offering([]);
    renderStep();

    const paid = document.querySelector("#member-paid") as HTMLInputElement;
    expect(paid.parentElement?.querySelectorAll("p")).toHaveLength(0);
  });
});
