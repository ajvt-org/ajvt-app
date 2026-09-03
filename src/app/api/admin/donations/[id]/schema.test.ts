import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { rejectionOf } from "@tests/schema";
import { donationUpdateSchema } from "./schema";

const OFFERED = ["بنكيلي", "السداد", "مصرفي", "نقداً"];
const schema = donationUpdateSchema(OFFERED);

describe("donationUpdateSchema", () => {
  it("accepts a single field", () => {
    expect(parse(schema, { status: "REJECTED" }).status).toBe("REJECTED");
  });

  it("rejects an empty patch", () => {
    expect(rejectionOf(schema, {})).toBe("بيانات غير صالحة");
  });

  it("rejects a status it does not know", () => {
    expect(rejectionOf(schema, { status: "PENDING" })).toBe("بيانات غير صالحة");
  });

  it("detaches a donation from an account with null", () => {
    expect(parse(schema, { userId: null }).userId).toBeNull();
  });

  it("rejects an account id that is not text", () => {
    expect(rejectionOf(schema, { userId: 7 })).toBe("بيانات غير صالحة");
  });

  it("leaves out what the patch did not mention", () => {
    const patched = parse(schema, { status: "ACTIVE" });

    expect(patched.donorPhoto).toBeUndefined();
    expect(patched.proof).toBeUndefined();
    expect(patched.donorPhone).toBeUndefined();
  });

  it("trims the name it stores", () => {
    expect(parse(schema, { donorName: "  أحمد  " }).donorName).toBe("أحمد");
  });

  it("reads a blank phone as no phone", () => {
    expect(parse(schema, { donorPhone: "" }).donorPhone).toBeNull();
  });

  it("reads a blank photo as no photo", () => {
    expect(parse(schema, { donorPhoto: "" }).donorPhoto).toBeNull();
  });

  it("hands the amount back as a number", () => {
    expect(parse(schema, { amount: "500" }).amount).toBe(500);
  });

  it("makes a donation anonymous with a null name", () => {
    expect(parse(schema, { donorName: null }).donorName).toBeNull();
  });

  it("rejects a blank name", () => {
    expect(rejectionOf(schema, { donorName: "  " })).toBe("الاسم مطلوب");
  });

  it("rejects a bad amount", () => {
    expect(rejectionOf(schema, { amount: 0 })).toBe("المبلغ يجب أن يكون رقماً صحيحاً موجباً");
  });

  it("rejects a payment method it does not know", () => {
    expect(rejectionOf(schema, { paymentMethod: "بيتكوين" })).toBe("طريقة دفع غير صالحة");
  });
});

describe("a method that stopped being offered", () => {
  it("refuses it when only the active list is handed in", () => {
    expect(rejectionOf(donationUpdateSchema(["بنكيلي"]), { paymentMethod: "نقداً" })).toBe(
      "طريقة دفع غير صالحة",
    );
  });

  it("accepts it when the value the record holds is handed in with the active list", () => {
    const accepted = donationUpdateSchema(["بنكيلي", "نقداً"]);
    expect(parse(accepted, { paymentMethod: "نقداً" }).paymentMethod).toBe("نقداً");
  });
});
