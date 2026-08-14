import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { rejectionOf } from "@tests/schema";
import { adminMemberUpdateSchema } from "./schema";

describe("adminMemberUpdateSchema", () => {
  it("accepts an empty patch", () => {
    expect(parse(adminMemberUpdateSchema, {})).toEqual({});
  });

  it("trims a renamed member", () => {
    expect(parse(adminMemberUpdateSchema, { fullName: "  محمد  " }).fullName).toBe("محمد");
  });

  it("rejects a blank name", () => {
    expect(rejectionOf(adminMemberUpdateSchema, { fullName: "  " })).toBe("الاسم الكامل مطلوب");
  });

  it("rejects a name over thirty characters", () => {
    expect(rejectionOf(adminMemberUpdateSchema, { fullName: "ا".repeat(31) })).toBe(
      "الاسم الكامل طويل جداً (30 حرفاً كحد أقصى)",
    );
  });

  it("rejects a blank age group", () => {
    expect(rejectionOf(adminMemberUpdateSchema, { age: "" })).toBe("اسم العصر مطلوب");
  });

  it("rejects an age group over thirty characters", () => {
    expect(rejectionOf(adminMemberUpdateSchema, { age: "ا".repeat(31) })).toBe(
      "اسم العصر طويل جداً (30 حرفاً كحد أقصى)",
    );
  });

  it("rejects a phone that is not text, which used to reach validatePhone", () => {
    expect(rejectionOf(adminMemberUpdateSchema, { phone: 22334455 })).toBe("بيانات غير صالحة");
  });

  it("rejects an account phone that is not text", () => {
    expect(rejectionOf(adminMemberUpdateSchema, { accountPhone: 22334455 })).toBe(
      "بيانات غير صالحة",
    );
  });

  it("clears a photo with null", () => {
    expect(parse(adminMemberUpdateSchema, { photo: null }).photo).toBeNull();
  });

  it("rejects a photo that is not a filename", () => {
    expect(rejectionOf(adminMemberUpdateSchema, { photo: 7 })).toBe("بيانات غير صالحة");
  });
});
