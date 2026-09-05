import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PaymentInfoBanner from "./PaymentInfoBanner";
import type { PayableMethods } from "@/lib/usePayableMethods";

const METHOD = "بنكيلي";
const CODE = "111111";

const OPEN = { name: METHOD, accounts: [{ id: "a1", code: CODE, label: null }] };

function offer(over: Partial<PayableMethods> = {}): PayableMethods {
  return { methods: [], loading: false, failed: false, ...over };
}

describe("the payment information on the donate screen", () => {
  it("shows the number a method receives into", () => {
    render(<PaymentInfoBanner offer={offer({ methods: [OPEN] })} />);
    expect(screen.getByText(CODE)).toBeDefined();
    expect(screen.getByText(METHOD)).toBeDefined();
  });

  it("shows no number while the answer is on its way", () => {
    render(<PaymentInfoBanner offer={offer({ loading: true })} />);
    expect(screen.queryByText(CODE)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says so when the numbers could not be loaded", () => {
    render(<PaymentInfoBanner offer={offer({ failed: true })} />);
    expect(screen.getByText(/تعذر/)).toBeDefined();
  });

  it("says so when nothing is on offer", () => {
    render(<PaymentInfoBanner offer={offer()} />);
    expect(screen.getByText(/لا توجد/)).toBeDefined();
  });

  it("keeps showing the note it was given", () => {
    render(<PaymentInfoBanner offer={offer({ methods: [OPEN] })} note="ملاحظة" />);
    expect(screen.getByText("ملاحظة")).toBeDefined();
  });
});
