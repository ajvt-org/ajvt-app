import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PaymentDateLine from "./PaymentDateLine";
import { paymentDates } from "@/lib/texts";
import { formatDate, formatTime } from "@/lib/utils";

const paid = "2026-06-11T00:00:00.000Z";
const recorded = "2026-08-02T09:31:00.000Z";

describe("the date on a payment", () => {
  it("says the day the money moved when the payment carries one", () => {
    render(<PaymentDateLine paidOn={paid} recordedAt={recorded} />);

    expect(screen.getByText(paymentDates.paidOn(formatDate(paid)))).toBeTruthy();
  });

  it("says the day the record was made when it does not, rather than guessing", () => {
    render(<PaymentDateLine paidOn={null} recordedAt={recorded} />);

    expect(
      screen.getByText(paymentDates.recordedOn(formatDate(recorded), formatTime(recorded))),
    ).toBeTruthy();
  });

  it("never dates a payment by the day it was recorded while it knows better", () => {
    render(<PaymentDateLine paidOn={paid} recordedAt={recorded} />);

    expect(screen.queryByText(new RegExp(formatDate(recorded)))).toBeNull();
  });
});
