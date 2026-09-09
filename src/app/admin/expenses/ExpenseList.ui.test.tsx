import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import ExpenseList from "./ExpenseList";
import type { Expense } from "./types";
import { expenseList as texts, expenseReceipts } from "@/lib/texts";

afterEach(cleanup);

const LONG = "شراء مواد البناء وحمولة الشاحنة من نواكشوط إلى قافلة التاكلالت الثانية";

function expense(over: Partial<Expense> = {}): Expense {
  return {
    id: "e1",
    label: LONG,
    amount: 12000,
    method: null,
    accountId: null,
    account: null,
    note: null,
    proof: null,
    proofs: [],
    date: "2026-09-01",
    createdBy: "المشرف",
    tags: [],
    activity: null,
    competition: null,
    allocations: [],
    ...over,
  };
}

function show(items: Expense[] = [expense()]) {
  return render(
    <ExpenseList
      expenses={items}
      filtered={false}
      busyId={null}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
}

describe("the label on an expense card", () => {
  it("wraps to a second line rather than losing its ending", () => {
    show();

    const label = screen.getByText(LONG);
    expect(label.className).not.toContain("truncate");
    expect(label.className).toContain("line-clamp-2");
    expect(label.style.overflowWrap).toBe("anywhere");
  });

  it("holds the amount at the top so it stays put when the label takes a second line", () => {
    const { container } = show();

    const amount = container.querySelector("p.font-black") as HTMLElement;
    expect(amount.className).toContain("self-start");
  });
});

describe("the words on an expense card", () => {
  it("names the three actions and the recorder from the texts module", () => {
    show();

    for (const word of [texts.edit, texts.delete, texts.history]) {
      expect(screen.getByText(word)).toBeDefined();
    }
    expect(screen.getByText(texts.recordedBy("المشرف"), { exact: false })).toBeDefined();
  });

  it("says what an empty ledger means", () => {
    show([]);

    expect(screen.getByText(texts.empty)).toBeDefined();
  });
});

describe("the receipts on an expense card", () => {
  it("opens one receipt straight from the card with no extra step", () => {
    const { container } = show([expense({ proofs: [{ filename: "one.webp" }] })]);

    const link = container.querySelector("a[href='/api/files/one.webp']") as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.target).toBe("_blank");
    expect(screen.queryByLabelText(expenseReceipts.title)).toBeNull();
  });

  it("puts every receipt behind the badge when there is more than one", () => {
    const proofs = [{ filename: "a.webp" }, { filename: "b.webp" }, { filename: "c.webp" }];
    const { container } = show([expense({ proofs })]);

    expect(screen.getByText("3")).toBeDefined();

    fireEvent.click(screen.getByLabelText(expenseReceipts.title));

    for (const row of proofs) {
      expect(container.querySelector(`a[href='/api/files/${row.filename}']`)).not.toBeNull();
    }
  });

  it("closes the receipts again", () => {
    const proofs = [{ filename: "a.webp" }, { filename: "b.webp" }];
    const { container } = show([expense({ proofs })]);

    fireEvent.click(screen.getByLabelText(expenseReceipts.title));
    expect(screen.getByLabelText(expenseReceipts.openOne(2))).toBeDefined();

    fireEvent.click(container.querySelector("button.rounded-full") as HTMLElement);
    expect(screen.queryByLabelText(expenseReceipts.openOne(2))).toBeNull();
  });
});
