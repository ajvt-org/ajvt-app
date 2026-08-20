import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { changePasswordSchema } from "./schema";
import { rejectionOf } from "@tests/schema";

describe("changePasswordSchema", () => {
  it("accepts both passwords", () => {
    expect(
      parse(changePasswordSchema, { currentPassword: "old", newPassword: "newpassword" }),
    ).toEqual({
      currentPassword: "old",
      newPassword: "newpassword",
    });
  });

  it("allows a missing current password, which a temporary one is not asked for", () => {
    expect(parse(changePasswordSchema, { newPassword: "newpassword" })).toEqual({
      newPassword: "newpassword",
    });
  });

  it("rejects an empty current password, so a blank field is not a valid answer", () => {
    expect(
      rejectionOf(changePasswordSchema, { currentPassword: "", newPassword: "newpassword" }),
    ).toBe("بيانات غير صالحة");
  });

  it("says how short is too short rather than a generic rejection", () => {
    expect(
      rejectionOf(changePasswordSchema, { currentPassword: "old", newPassword: "1234567" }),
    ).toBe("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
  });

  it("accepts exactly the eight character floor", () => {
    expect(parse(changePasswordSchema, { newPassword: "12345678" }).newPassword).toBe("12345678");
  });
});
