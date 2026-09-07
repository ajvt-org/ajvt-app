import { describe, it, expect } from "vitest";
import { membershipPaymentFields, NO_MEMBERSHIP_PAYMENT } from "./membershipPaymentRead";

const REVIEWED = new Date("2026-03-01T10:00:00Z");

describe("what a membership payment says about how it was paid", () => {
  it("gives back nothing when the membership has no payment", () => {
    expect(membershipPaymentFields(null)).toEqual(NO_MEMBERSHIP_PAYMENT);
    expect(membershipPaymentFields(undefined)).toEqual(NO_MEMBERSHIP_PAYMENT);
  });

  it("hands the payment's fields back under the names the membership used", () => {
    expect(
      membershipPaymentFields({
        method: "بنكيلي",
        accountId: "acc-1",
        bankReference: "884422",
        proof: "one.webp",
        referenceCode: "AJ-1234",
        recordedBy: "boss",
        reviewedBy: "boss",
        reviewedAt: REVIEWED,
      }),
    ).toEqual({
      paymentMethod: "بنكيلي",
      accountId: "acc-1",
      bankReference: "884422",
      paymentProof: "one.webp",
      referenceCode: "AJ-1234",
      recordedBy: "boss",
      reviewedBy: "boss",
      reviewedAt: REVIEWED,
    });
  });

  it("keeps an empty field empty rather than dropping it", () => {
    expect(
      membershipPaymentFields({
        method: "بنكيلي",
        accountId: null,
        bankReference: null,
        proof: null,
        referenceCode: null,
        recordedBy: null,
        reviewedBy: null,
        reviewedAt: null,
      }),
    ).toEqual({ ...NO_MEMBERSHIP_PAYMENT, paymentMethod: "بنكيلي" });
  });
});
