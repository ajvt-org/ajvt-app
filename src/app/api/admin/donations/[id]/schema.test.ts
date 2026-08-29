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

  it("detaches a donation from an account with null", () => {
    expect(parse(donationUpdateSchema, { userId: null }).userId).toBeNull();
  });

  it("rejects an account id that is not text", () => {
    expect(rejectionOf(donationUpdateSchema, { userId: 7 })).toBe("بيانات غير صالحة");
  });

  it("leaves out what the patch did not mention", () => {
    const patched = parse(donationUpdateSchema, { status: "ACTIVE" });

    expect(patched.donorPhoto).toBeUndefined();
    expect(patched.proof).toBeUndefined();
    expect(patched.donorPhone).toBeUndefined();
  });

  it("trims the name it stores", () => {
    expect(parse(donationUpdateSchema, { donorName: "  أحمد  " }).donorName).toBe("أحمد");
  });

  it("reads a blank phone as no phone", () => {
    expect(parse(donationUpdateSchema, { donorPhone: "" }).donorPhone).toBeNull();
  });

  it("reads a blank photo as no photo", () => {
    expect(parse(donationUpdateSchema, { donorPhoto: "" }).donorPhoto).toBeNull();
  });

  it("hands the amount back as a number", () => {
    expect(parse(donationUpdateSchema, { amount: "500" }).amount).toBe(500);
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
