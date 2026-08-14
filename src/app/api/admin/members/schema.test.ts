import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { rejectionOf } from "@tests/schema";
import { adminMemberCreateSchema } from "./schema";

const valid = {
  accountPhone: "22334455",
  fullName: "محمد ولد أحمد",
  memberPhone: "33445566",
  age: "أشبال",
  paymentMethod: "نقداً",
  status: "ACTIVE",
};

describe("adminMemberCreateSchema", () => {
  it("accepts a full manual entry", () => {
    const parsed = parse(adminMemberCreateSchema, valid);
    expect(parsed.fullName).toBe("محمد ولد أحمد");
    expect(parsed.status).toBe("ACTIVE");
  });

  it("accepts an entry with no phone at all", () => {
    const parsed = parse(adminMemberCreateSchema, {
      fullName: "محمد",
      age: "أشبال",
      paymentMethod: "نقداً",
      status: "PENDING",
      phoneUnknown: true,
    });
    expect(parsed.phoneUnknown).toBe(true);
  });

  it("rejects a missing name", () => {
    expect(rejectionOf(adminMemberCreateSchema, { ...valid, fullName: "" })).toBe(
      "جميع الحقول مطلوبة",
    );
  });

  it("rejects a missing age group", () => {
    expect(rejectionOf(adminMemberCreateSchema, { ...valid, age: "  " })).toBe(
      "جميع الحقول مطلوبة",
    );
  });

  it("rejects a missing payment method", () => {
    expect(rejectionOf(adminMemberCreateSchema, { ...valid, paymentMethod: "" })).toBe(
      "جميع الحقول مطلوبة",
    );
  });

  it("rejects a name over thirty characters", () => {
    expect(rejectionOf(adminMemberCreateSchema, { ...valid, fullName: "ا".repeat(31) })).toBe(
      "الاسم الكامل طويل جداً (30 حرفاً كحد أقصى)",
    );
  });

  it("rejects an age group over thirty characters", () => {
    expect(rejectionOf(adminMemberCreateSchema, { ...valid, age: "ا".repeat(31) })).toBe(
      "اسم العصر طويل جداً (30 حرفاً كحد أقصى)",
    );
  });

  it("rejects a status it does not know", () => {
    expect(rejectionOf(adminMemberCreateSchema, { ...valid, status: "REJECTED" })).toBe(
      "حالة غير صالحة",
    );
  });

  it("rejects a photo that is not a filename", () => {
    expect(rejectionOf(adminMemberCreateSchema, { ...valid, photo: 7 })).toBe("بيانات غير صالحة");
  });

  it("rejects a proof that is not a filename", () => {
    expect(rejectionOf(adminMemberCreateSchema, { ...valid, paymentProof: 7 })).toBe(
      "بيانات غير صالحة",
    );
  });

  it("rejects an account phone of the wrong length", () => {
    expect(rejectionOf(adminMemberCreateSchema, { ...valid, accountPhone: "123" })).toBe(
      "يجب أن يكون رقم الهاتف 8 أرقام بالضبط",
    );
  });

  it("rejects an account phone starting with the wrong digit", () => {
    expect(rejectionOf(adminMemberCreateSchema, { ...valid, accountPhone: "12345678" })).toBe(
      "يجب أن يبدأ الرقم بـ 2 أو 3 أو 4",
    );
  });

  it("asks for an account phone when the phone is known", () => {
    const { accountPhone: _drop, ...body } = valid;
    void _drop;
    expect(rejectionOf(adminMemberCreateSchema, body)).toBe(
      "يجب أن يكون رقم الهاتف 8 أرقام بالضبط",
    );
  });

  it("asks for a member phone when the phone is known", () => {
    expect(rejectionOf(adminMemberCreateSchema, { ...valid, memberPhone: "" })).toBe(
      "جميع الحقول مطلوبة",
    );
  });

  it("skips both phone checks when the phone is unknown", () => {
    const parsed = parse(adminMemberCreateSchema, {
      ...valid,
      phoneUnknown: true,
      memberPhone: "",
    });
    expect(parsed.fullName).toBe("محمد ولد أحمد");
  });
});
