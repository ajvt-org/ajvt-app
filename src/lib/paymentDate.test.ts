import { describe, it, expect } from "vitest";
import { paidWithin, paymentDate, readMoneyDate } from "./paymentDate";
import { parseMatchDate } from "./clubTime";

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

describe("readMoneyDate", () => {
  it("anchors the day a date field sends at midday, so no clock reads it as the day before", () => {
    expect(readMoneyDate("2026-07-14")).toEqual(new Date("2026-07-14T12:00:00.000Z"));
  });

  it("leaves a full timestamp alone", () => {
    expect(readMoneyDate("2026-07-14T06:30:00.000Z")).toEqual(new Date("2026-07-14T06:30:00.000Z"));
  });

  it("reads an empty field as no date rather than as an invalid one", () => {
    expect(readMoneyDate("")).toBeNull();
    expect(readMoneyDate(null)).toBeNull();
    expect(readMoneyDate(undefined)).toBeNull();
  });

  it("refuses a date it cannot read", () => {
    expect(readMoneyDate("not a day")).toBeNull();
  });

  it("keeps the hour and minute a datetime field sends", () => {
    expect(readMoneyDate("2026-07-14T06:30")).toEqual(new Date("2026-07-14T06:30:00.000Z"));
    expect(readMoneyDate("2026-07-14T18:45:00")).toEqual(new Date("2026-07-14T18:45:00.000Z"));
  });

  it("reads the hour on the club wall clock", () => {
    expect(readMoneyDate("2026-07-14T06:30")).toEqual(parseMatchDate("2026-07-14T06:30"));
  });

  it("orders two moments on one day", () => {
    const morning = readMoneyDate("2026-07-14T09:00");
    const afternoon = readMoneyDate("2026-07-14T16:00");
    expect(morning!.getTime()).toBeLessThan(afternoon!.getTime());
  });
});
