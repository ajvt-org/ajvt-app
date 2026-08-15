import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { changePasswordSchema } from "./schema";
import { rejectionOf } from "@tests/schema";

describe("changePasswordSchema", () => {
  it("accepts both passwords", () => {
    expect(parse(changePasswordSchema, { currentPassword: "old", newPassword: "new" })).toEqual({
      currentPassword: "old",
      newPassword: "new",
    });
  });

  it("allows a missing current password, which a temporary one is not asked for", () => {
    expect(parse(changePasswordSchema, { newPassword: "new" })).toEqual({ newPassword: "new" });
  });

  it("rejects an empty current password, so a blank field is not a valid answer", () => {
    expect(rejectionOf(changePasswordSchema, { currentPassword: "", newPassword: "new" })).toBe(
      "بيانات غير صالحة",
    );
  });

  it("says how short is too short rather than a generic rejection", () => {
    expect(rejectionOf(changePasswordSchema, { currentPassword: "old", newPassword: "ab" })).toBe(
      "كلمة المرور يجب أن تكون 3 أحرف على الأقل",
    );
  });
});
