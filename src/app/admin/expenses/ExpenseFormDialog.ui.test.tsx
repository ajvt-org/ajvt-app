import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ExpenseFormDialog from "./ExpenseFormDialog";
import { emptyExpenseForm, type ExpenseForm } from "./types";
import { expenseForm as texts } from "@/lib/texts";
import { answering, OFFERED_METHODS } from "@tests/ui/paymentMethods";

const RETIRED = "خدمة توقفت";

function stubMethods() {
  vi.stubGlobal("fetch", vi.fn(answering(async () => ({ ok: true, json: async () => ({}) }))));
}

function show(over: Partial<ExpenseForm> = {}) {
  render(
    <ExpenseFormDialog
      form={{ ...emptyExpenseForm, ...over }}
      tags={[]}
      destinations={[]}
      editing={Boolean(over.method)}
      error=""
      saving={false}
      onChange={vi.fn()}
      onSubmit={vi.fn()}
      onClose={vi.fn()}
    />,
  );
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
