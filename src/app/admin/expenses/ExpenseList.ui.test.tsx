import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ExpenseList from "./ExpenseList";
import type { Expense } from "./types";
import { expenseList as texts } from "@/lib/texts";

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
