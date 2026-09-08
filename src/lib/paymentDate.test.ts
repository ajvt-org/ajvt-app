import { describe, it, expect } from "vitest";
import { paidWithin, paymentDate, readPaidOn } from "./paymentDate";

const made = new Date("2026-07-14T00:00:00.000Z");
const recorded = new Date("2026-08-02T09:31:00.000Z");

describe("paymentDate", () => {
  it("takes the day the money moved when the payment carries one", () => {
    expect(paymentDate({ paidOn: made, createdAt: recorded })).toEqual(made);
  });

  it("falls back to the day the record was made when it does not", () => {
    expect(paymentDate({ paidOn: null, createdAt: recorded })).toEqual(recorded);
  });

  it("works on the dates a browser receives as strings", () => {
    expect(paymentDate({ paidOn: "2026-07-14", createdAt: "2026-08-02" })).toBe("2026-07-14");
    expect(paymentDate({ paidOn: null, createdAt: "2026-08-02" })).toBe("2026-08-02");
  });
});

describe("paidWithin", () => {
  it("asks for the payment date, and for the record date only where there is none", () => {
    const window = { gte: made, lte: recorded };
    expect(paidWithin(window)).toEqual({
      OR: [{ paidOn: window }, { paidOn: null, createdAt: window }],
    });
  });

  it("takes a window open at one end", () => {
    const window = { gte: made };
    expect(paidWithin(window)).toEqual({
      OR: [{ paidOn: window }, { paidOn: null, createdAt: window }],
    });
  });

  it("narrows nothing when there is no window", () => {
    expect(paidWithin(undefined)).toEqual({});
    expect(paidWithin({})).toEqual({});
  });
});

describe("readPaidOn", () => {
  it("reads the day a date field sends", () => {
    expect(readPaidOn("2026-07-14")).toEqual(new Date("2026-07-14"));
  });

  it("reads an empty field as no date rather than as an invalid one", () => {
    expect(readPaidOn("")).toBeNull();
    expect(readPaidOn(null)).toBeNull();
    expect(readPaidOn(undefined)).toBeNull();
  });

  it("refuses a date it cannot read", () => {
    expect(readPaidOn("not a day")).toBeNull();
  });
});
