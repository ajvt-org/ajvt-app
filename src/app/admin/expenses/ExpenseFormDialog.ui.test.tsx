import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import ExpenseFormDialog from "./ExpenseFormDialog";
import { emptyExpenseForm, type ExpenseForm } from "./types";
import { expenseForm as texts, paymentAccountPicker } from "@/lib/texts";
import { answering, OFFERED_METHODS } from "@tests/ui/paymentMethods";

const RETIRED = "خدمة توقفت";

function stubMethods() {
  vi.stubGlobal("fetch", vi.fn(answering(async () => ({ ok: true, json: async () => ({}) }))));
}

function show(
  over: Partial<ExpenseForm> = {},
  held: { id: string; code: string; label: string | null } | null = null,
  onChange = vi.fn(),
) {
  render(
    <ExpenseFormDialog
      form={{ ...emptyExpenseForm, ...over }}
      held={held}
      tags={[]}
      destinations={[]}
      editing={Boolean(over.method)}
      expenseId={null}
      error=""
      saving={false}
      onChange={onChange}
      onSubmit={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  return onChange;
}

function methodOptions(): string[] {
  const select = screen.getByLabelText(texts.method) as HTMLSelectElement;
  return [...select.options].map((option) => option.value).filter(Boolean);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the payment method on the expense dialog", () => {
  it("offers what the table still offers", async () => {
    stubMethods();
    show();

    await waitFor(() => expect(methodOptions().length).toBeGreaterThan(0));
    expect(methodOptions()).toEqual(OFFERED_METHODS.map((method) => method.name));
  });

  it("keeps offering the method the expense already holds once it stops being offered", async () => {
    stubMethods();
    show({ method: RETIRED });

    await waitFor(() => expect(methodOptions()).toContain(RETIRED));
  });

  it("leaves the offered methods in the order they came back in", async () => {
    stubMethods();
    show({ method: RETIRED });

    await waitFor(() => expect(methodOptions()).toContain(RETIRED));
    expect(methodOptions().at(-1)).toBe(RETIRED);
  });
});

describe("the number an expense was paid from", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is not asked for at all when money left in person", async () => {
    stubMethods();
    show({ method: "نقداً" });

    await waitFor(() => expect(methodOptions().length).toBeGreaterThan(0));
    expect(screen.queryByLabelText(paymentAccountPicker.expenseLabel)).toBeNull();
  });

  it("is asked for when the method has one", async () => {
    stubMethods();
    show({ method: "بنكيلي" });

    const picker = await screen.findByLabelText(paymentAccountPicker.expenseLabel);
    expect(within(picker).getByText("111111")).toBeDefined();
  });

  it("may be left unknown", async () => {
    stubMethods();
    show({ method: "بنكيلي" });

    const picker = (await screen.findByLabelText(
      paymentAccountPicker.expenseLabel,
    )) as HTMLSelectElement;
    expect(picker.value).toBe("");
    expect(within(picker).getByText(paymentAccountPicker.unknown)).toBeDefined();
  });

  it("keeps a closed number the expense already points at", async () => {
    stubMethods();
    show({ method: "بنكيلي", accountId: "old" }, { id: "old", code: "999999", label: null });

    const picker = (await screen.findByLabelText(
      paymentAccountPicker.expenseLabel,
    )) as HTMLSelectElement;
    expect(picker.value).toBe("old");
  });

  it("is cleared when the method changes under it", async () => {
    stubMethods();
    const onChange = show({ method: "بنكيلي", accountId: "a1" });

    await screen.findByLabelText(paymentAccountPicker.expenseLabel);
    fireEvent.change(screen.getByLabelText(texts.method), { target: { value: "مصرفي" } });

    expect(onChange).toHaveBeenCalledWith({ method: "مصرفي", accountId: "" });
  });
});
