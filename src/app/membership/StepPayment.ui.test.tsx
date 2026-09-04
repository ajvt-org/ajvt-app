import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import StepPayment from "./StepPayment";
import type { PaymentValues } from "./constants";

const NEW_METHOD = "خدمة جديدة";

function offering(methods: { name: string; memberFacing: boolean; accounts: unknown[] }[]) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ methods }),
  })) as unknown as typeof fetch;
}

const form: PaymentValues = { paymentMethod: "", paidAmount: "", referenceCode: "" };

function renderStep() {
  render(
    <StepPayment
      form={form}
      setForm={vi.fn()}
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
