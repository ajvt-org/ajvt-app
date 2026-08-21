import { describe, it, expect } from "vitest";
import { receiptFilename, receiptReference, receiptTitle, type ReceiptRow } from "./receipts";

const row = (over: Partial<ReceiptRow> = {}): ReceiptRow => ({
  id: "cmt2a64b30024phqdmq2wv47x",
  amount: 1000,
  purpose: "DONATION",
  paidAt: "2026-08-21T10:00:00.000Z",
  year: null,
  memberNumber: "AJVT-0042",
  payerName: "محمد",
  activityTitle: null,
  ...over,
});

describe("receiptTitle", () => {
  it("names the year a membership covers", () => {
    expect(receiptTitle(row({ purpose: "MEMBERSHIP", year: 2026 }))).toBe("اشتراك عضوية 2026");
  });

  it("names a membership with no year without a stray number", () => {
    expect(receiptTitle(row({ purpose: "MEMBERSHIP", year: null }))).toBe("اشتراك عضوية");
  });

  it("names the activity a gift supported", () => {
    expect(receiptTitle(row({ purpose: "ACTIVITY", activityTitle: "القافلة الصحية" }))).toBe(
      "دعم نشاط — القافلة الصحية",
    );
  });

  it("falls back to the plain label when the activity is gone", () => {
    expect(receiptTitle(row({ purpose: "ACTIVITY", activityTitle: null }))).toBe("دعم نشاط");
  });

  it("names a plain gift", () => {
    expect(receiptTitle(row())).toBe("تبرع");
  });
});

describe("receiptReference", () => {
  it("is short enough to read out and copy", () => {
    expect(receiptReference(row())).toBe("MQ2WV47X");
  });

  it("is stable for the same payment", () => {
    expect(receiptReference(row())).toBe(receiptReference(row()));
  });

  it("differs between payments", () => {
    expect(receiptReference(row())).not.toBe(receiptReference(row({ id: "other-payment-id" })));
  });
});

describe("receiptFilename", () => {
  it("carries the reference so two receipts never overwrite each other", () => {
    expect(receiptFilename(row())).toBe("وصل-MQ2WV47X.png");
  });
});
