import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PaymentActions from "./PaymentActions";

describe("the actions under a payment", () => {
  it("keeps what cannot be undone out of the group holding the routine verbs", () => {
    render(
      <PaymentActions danger={<button>حذف</button>}>
        <button>قبول</button>
        <button>رفض</button>
      </PaymentActions>,
    );

    const routine = screen.getByText("قبول").parentElement!;
    expect(routine.contains(screen.getByText("رفض"))).toBe(true);
    expect(routine.contains(screen.getByText("حذف"))).toBe(false);
  });

  it("lets the routine group take the slack so the destructive one keeps the far end", () => {
    render(
      <PaymentActions danger={<button>حذف</button>}>
        <button>قبول</button>
      </PaymentActions>,
    );

    expect(screen.getByText("قبول").parentElement!.className).toContain("flex-1");
  });

  it("never lets the destructive group be squeezed or carried onto another line", () => {
    render(
      <PaymentActions danger={<button>حذف</button>}>
        <button>قبول</button>
      </PaymentActions>,
    );

    const danger = screen.getByText("حذف").parentElement!;
    expect(danger.className).toContain("shrink-0");
    expect(danger.parentElement!.className).not.toContain("flex-wrap");
  });

  it("gives a panel opened in the bar the whole line and drops the destructive group under it", () => {
    render(
      <PaymentActions stacked danger={<button>حذف</button>}>
        <button>قبول</button>
      </PaymentActions>,
    );

    const routine = screen.getByText("قبول").parentElement!;
    const danger = screen.getByText("حذف").parentElement!;
    expect(routine.className).toContain("basis-full");
    expect(danger.className).toContain("ms-auto");
  });

  it("draws no destructive group when a payment has nothing to destroy", () => {
    render(
      <PaymentActions>
        <button>قبول</button>
      </PaymentActions>,
    );

    expect(screen.getByText("قبول").parentElement!.parentElement!.children).toHaveLength(1);
  });
});
