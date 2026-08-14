import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { rejectionOf } from "@tests/schema";
import { donationUpdateSchema } from "./schema";

describe("donationUpdateSchema", () => {
  it("accepts a single field", () => {
    expect(parse(donationUpdateSchema, { status: "REJECTED" }).status).toBe("REJECTED");
  });

  it("rejects an empty patch", () => {
    expect(rejectionOf(donationUpdateSchema, {})).toBe("بيانات غير صالحة");
  });

  it("rejects a status it does not know", () => {
    expect(rejectionOf(donationUpdateSchema, { status: "PENDING" })).toBe("بيانات غير صالحة");
  });

  it("detaches a donation from a member with null", () => {
    expect(parse(donationUpdateSchema, { memberId: null }).memberId).toBeNull();
  });

  it("rejects a member id that is not text", () => {
    expect(rejectionOf(donationUpdateSchema, { memberId: 7 })).toBe("بيانات غير صالحة");
  });

  it("makes a donation anonymous with a null name", () => {
    expect(parse(donationUpdateSchema, { donorName: null }).donorName).toBeNull();
  });

  it("rejects a blank name", () => {
    expect(rejectionOf(donationUpdateSchema, { donorName: "  " })).toBe("الاسم مطلوب");
  });

  it("rejects a bad amount", () => {
    expect(rejectionOf(donationUpdateSchema, { amount: 0 })).toBe(
      "المبلغ يجب أن يكون رقماً صحيحاً موجباً",
    );
  });

  it("rejects a payment method it does not know", () => {
    expect(rejectionOf(donationUpdateSchema, { paymentMethod: "بيتكوين" })).toBe(
      "طريقة دفع غير صالحة",
    );
  });
});
