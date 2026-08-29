import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { rejectionOf } from "@tests/schema";
import { donationCreateSchema } from "./schema";

const valid = { donorName: "فاعل خير", amount: 500 };

describe("donationCreateSchema", () => {
  it("accepts a name and an amount", () => {
    expect(parse(donationCreateSchema, valid)).toMatchObject({
      donorName: "فاعل خير",
    });
  });

  it("trims the donor name", () => {
    expect(parse(donationCreateSchema, { ...valid, donorName: "  خالد  " }).donorName).toBe("خالد");
  });

  it("rejects a missing name", () => {
    expect(rejectionOf(donationCreateSchema, { amount: 500 })).toBe("الاسم مطلوب");
  });

  it("rejects a blank name", () => {
    expect(rejectionOf(donationCreateSchema, { ...valid, donorName: "   " })).toBe("الاسم مطلوب");
  });

  it("rejects a name over fifty characters", () => {
    expect(rejectionOf(donationCreateSchema, { ...valid, donorName: "ا".repeat(51) })).toBe(
      "الاسم طويل جداً (50 حرفاً كحد أقصى)",
    );
  });

  it("takes an amount typed into a number field", () => {
    expect(parse(donationCreateSchema, { ...valid, amount: "500" }).amount).toBe(500);
  });

  it("rejects an amount of zero", () => {
    expect(rejectionOf(donationCreateSchema, { ...valid, amount: 0 })).toBe(
      "المبلغ يجب أن يكون رقماً صحيحاً موجباً",
    );
  });

  it("rejects a negative amount", () => {
    expect(rejectionOf(donationCreateSchema, { ...valid, amount: -1 })).toBe(
      "المبلغ يجب أن يكون رقماً صحيحاً موجباً",
    );
  });

  it("rejects a fractional amount", () => {
    expect(rejectionOf(donationCreateSchema, { ...valid, amount: 1.5 })).toBe(
      "المبلغ يجب أن يكون رقماً صحيحاً موجباً",
    );
  });

  it("reads an empty donor phone as no phone", () => {
    expect(parse(donationCreateSchema, { ...valid, donorPhone: "" }).donorPhone).toBeNull();
  });

  it("takes the account a gift is linked to at creation", () => {
    expect(parse(donationCreateSchema, { ...valid, userId: "u1" }).userId).toBe("u1");
  });

  it("leaves a gift unlinked when no account is given", () => {
    expect(parse(donationCreateSchema, valid).userId).toBeUndefined();
  });

  it("rejects a donor phone of the wrong length", () => {
    expect(rejectionOf(donationCreateSchema, { ...valid, donorPhone: "123" })).toBe(
      "يجب أن يكون رقم الهاتف 8 أرقام بالضبط",
    );
  });

  it("accepts a known payment method", () => {
    expect(parse(donationCreateSchema, { ...valid, paymentMethod: "بنكيلي" }).paymentMethod).toBe(
      "بنكيلي",
    );
  });

  it("rejects a payment method it does not know", () => {
    expect(rejectionOf(donationCreateSchema, { ...valid, paymentMethod: "بيتكوين" })).toBe(
      "طريقة دفع غير صالحة",
    );
  });

  it("rejects a proof that is not a filename", () => {
    expect(rejectionOf(donationCreateSchema, { ...valid, proof: 7 })).toBe("بيانات غير صالحة");
  });
});
