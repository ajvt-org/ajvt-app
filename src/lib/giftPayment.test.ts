import { describe, it, expect } from "vitest";
import { giftPurpose, giftRow, isMembershipMoney, type GiftPayment } from "./giftPayment";

const GIFT: GiftPayment = {
  id: "p1",
  purpose: "DONATION",
  anonymous: false,
  donorName: "خالد الأمين",
  donorPhone: null,
  donorPhoto: null,
  amount: 5000,
  proof: "proof.webp",
  status: "ACTIVE",
  source: "PUBLIC",
  method: "بنكيلي",
  accountId: null,
  bankReference: null,
  userId: null,
  activityId: null,
  competitionId: null,
  paidOn: new Date("2026-06-11T12:00:00.000Z"),
  createdAt: new Date("2026-06-11T12:00:00.000Z"),
  updatedAt: new Date("2026-06-11T12:00:00.000Z"),
  user: null,
};

describe("the purpose a gift is recorded under", () => {
  it("is a donation when the gift names no destination", () => {
    expect(giftPurpose({})).toBe("DONATION");
    expect(giftPurpose({ activityId: null, competitionId: null })).toBe("DONATION");
  });

  it("is an activity when the gift is earmarked for an activity", () => {
    expect(giftPurpose({ activityId: "a1", competitionId: null })).toBe("ACTIVITY");
  });

  it("is an activity when the gift is earmarked for a competition", () => {
    expect(giftPurpose({ activityId: null, competitionId: "c1" })).toBe("ACTIVITY");
  });
});

describe("money that came in as a membership", () => {
  it("is recognised by its purpose", () => {
    expect(isMembershipMoney({ purpose: "MEMBERSHIP" })).toBe(true);
  });

  it("leaves a gift and an earmarked gift alone", () => {
    expect(isMembershipMoney({ purpose: "DONATION" })).toBe(false);
    expect(isMembershipMoney({ purpose: "ACTIVITY" })).toBe(false);
  });
});

describe("a gift read off the payment", () => {
  it("names the method the way the gift routes name it", () => {
    const row = giftRow(GIFT);

    expect(row.paymentMethod).toBe("بنكيلي");
    expect("method" in row).toBe(false);
  });

  it("carries the rest of the row through untouched", () => {
    const row = giftRow(GIFT);

    expect(row.id).toBe("p1");
    expect(row.donorName).toBe("خالد الأمين");
    expect(row.amount).toBe(5000);
    expect(row.source).toBe("PUBLIC");
  });
});
