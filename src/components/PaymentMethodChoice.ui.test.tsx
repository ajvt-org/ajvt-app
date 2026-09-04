import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PaymentMethodChoice from "./PaymentMethodChoice";
import type { PayableMethods } from "@/lib/usePayableMethods";

const FIRST = "بنكيلي";
const SECOND = "السداد";

function offer(over: Partial<PayableMethods> = {}): PayableMethods {
  return { methods: [], loading: false, failed: false, ...over };
}

const TWO = [
  { name: FIRST, accounts: [{ id: "a1", code: "111111", label: null }] },
  { name: SECOND, accounts: [{ id: "a2", code: "222222", label: null }] },
];

function choice(over: Partial<PayableMethods>, value = "", onPick = vi.fn()) {
  render(
    <PaymentMethodChoice
      offer={offer(over)}
      value={value}
      onPick={onPick}
      labelledBy="method-label"
    />,
  );
  return onPick;
}

describe("choosing how to pay", () => {
  it("offers each method it was given", () => {
    choice({ methods: TWO });
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("says which one is chosen", () => {
    choice({ methods: TWO }, SECOND);
    expect(screen.getByRole("radio", { name: SECOND }).getAttribute("aria-checked")).toBe("true");
  });

  it("reports the one that was picked", () => {
    const onPick = choice({ methods: TWO });
    fireEvent.click(screen.getByRole("radio", { name: FIRST }));
    expect(onPick).toHaveBeenCalledWith(FIRST);
  });

  it("offers nothing to choose while the answer is on its way", () => {
    choice({ loading: true });
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.queryByText(/تعذر/)).toBeNull();
  });

  it("says so when the methods could not be loaded", () => {
    choice({ failed: true });
    expect(screen.getByText(/تعذر/)).toBeDefined();
  });

  it("says so when none is on offer", () => {
    choice({});
    expect(screen.getByText(/لا توجد/)).toBeDefined();
  });
});
