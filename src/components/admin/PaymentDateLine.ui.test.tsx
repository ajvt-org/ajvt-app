import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PaymentDateLine from "./PaymentDateLine";
import { paymentDates } from "@/lib/texts";
import { formatDate, formatDateTime } from "@/lib/clubTime";

const paid = "2026-06-11T00:00:00.000Z";
const recorded = "2026-08-02T09:31:00.000Z";

describe("the date on a payment", () => {
  it("says the day the money moved when the payment carries one", () => {
    render(<PaymentDateLine paidOn={paid} recordedAt={recorded} />);

    expect(screen.getByText(formatDate(paid)).parentElement?.textContent).toContain(
      paymentDates.paidOn,
    );
  });

  it("says the day the record was made when it does not, rather than guessing", () => {
    render(<PaymentDateLine paidOn={null} recordedAt={recorded} />);

    expect(screen.getByText(formatDateTime(recorded)).parentElement?.textContent).toContain(
      paymentDates.recordedOn,
    );
  });

  it("never dates a payment by the day it was recorded while it knows better", () => {
    render(<PaymentDateLine paidOn={paid} recordedAt={recorded} />);

    expect(screen.queryByText(new RegExp(formatDate(recorded)))).toBeNull();
  });

  it("keeps the day and the hour in one run so they are not drawn apart", () => {
    render(<PaymentDateLine paidOn={null} recordedAt={recorded} />);

    const stamp = screen.getByText(formatDateTime(recorded));

    expect(stamp.tagName).toBe("BDI");
    expect(stamp.getAttribute("dir")).toBe("ltr");
  });

  it("isolates the day the money moved as well", () => {
    render(<PaymentDateLine paidOn={paid} recordedAt={recorded} />);

    expect(screen.getByText(formatDate(paid)).tagName).toBe("BDI");
  });
});
