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

  it("pushes the destructive group to the far side of whichever line it lands on", () => {
    render(
      <PaymentActions danger={<button>حذف</button>}>
        <button>قبول</button>
      </PaymentActions>,
    );

    expect(screen.getByText("حذف").parentElement!.className).toContain("ms-auto");
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
