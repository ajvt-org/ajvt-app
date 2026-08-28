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

  it("takes a blank age group, which the route reads as clearing it", () => {
    expect(parse(adminMemberUpdateSchema, { age: "" }).age).toBe("");
  });

  it("takes a null age group for a member outside the home village", () => {
    expect(parse(adminMemberUpdateSchema, { age: null }).age).toBeNull();
  });

  it("trims a corrected village", () => {
    expect(parse(adminMemberUpdateSchema, { village: "  أفجار  " }).village).toBe("أفجار");
  });

  it("rejects a blank village", () => {
    expect(rejectionOf(adminMemberUpdateSchema, { village: "  " })).toBe("يرجى اختيار القرية");
  });

  it("rejects a village over thirty characters", () => {
    expect(rejectionOf(adminMemberUpdateSchema, { village: "ب".repeat(31) })).toBe(
      "اسم القرية طويل جداً (30 حرفاً كحد أقصى)",
    );
  });

  it("rejects an age group over thirty characters", () => {
    expect(rejectionOf(adminMemberUpdateSchema, { age: "ا".repeat(31) })).toBe(
      "اسم العصر طويل جداً (30 حرفاً كحد أقصى)",
    );
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
