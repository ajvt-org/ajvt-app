import { describe, it, expect } from "vitest";
import { receiptTitle, type ReceiptSubject } from "./receipts";

const subject = (over: Partial<ReceiptSubject> = {}): ReceiptSubject => ({
  purpose: "DONATION",
  year: null,
  activityTitle: null,
  ...over,
});

describe("what a receipt says it is for", () => {
  it("names the year a membership covers", () => {
    expect(receiptTitle(subject({ purpose: "MEMBERSHIP", year: 2026 }))).toBe("اشتراك عضوية 2026");
  });

  it("names a membership with no year without a stray number", () => {
    expect(receiptTitle(subject({ purpose: "MEMBERSHIP", year: null }))).toBe("اشتراك عضوية");
  });

  it("names the activity a gift supported", () => {
    expect(receiptTitle(subject({ purpose: "ACTIVITY", activityTitle: "القافلة الصحية" }))).toBe(
      "دعم نشاط — القافلة الصحية",
    );
  });

  it("falls back to the plain label when the activity is gone", () => {
    expect(receiptTitle(subject({ purpose: "ACTIVITY", activityTitle: null }))).toBe("دعم نشاط");
  });

  it("names a plain gift", () => {
    expect(receiptTitle(subject())).toBe("تبرع");
  });
});
