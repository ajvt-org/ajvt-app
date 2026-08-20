import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { registerSchema } from "./schema";
import { rejectionOf } from "@tests/schema";

describe("registerSchema", () => {
  it("accepts a valid phone and an eight character password", () => {
    expect(parse(registerSchema, { phone: "22334455", password: "12345678" })).toEqual({
      phone: "22334455",
      password: "12345678",
    });
  });

  it("trims the phone the way the route stores it", () => {
    expect(parse(registerSchema, { phone: " 22334455 ", password: "12345678" }).phone).toBe(
      "22334455",
    );
  });

  it("rejects a seven character password with the floor spelled out", () => {
    expect(rejectionOf(registerSchema, { phone: "22334455", password: "1234567" })).toBe(
      "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
    );
  });

  it("asks for both fields when one is missing", () => {
    expect(rejectionOf(registerSchema, { phone: "22334455" })).toBe("أدخل رقم الهاتف وكلمة المرور");
    expect(rejectionOf(registerSchema, { password: "12345678" })).toBe(
      "أدخل رقم الهاتف وكلمة المرور",
    );
  });

  it("rejects a phone that fails the shared phone rules", () => {
    expect(rejectionOf(registerSchema, { phone: "12345678", password: "12345678" })).toBe(
      "يجب أن يبدأ الرقم بـ 2 أو 3 أو 4",
    );
    expect(rejectionOf(registerSchema, { phone: "223344", password: "12345678" })).toBe(
      "يجب أن يكون رقم الهاتف 8 أرقام بالضبط",
    );
  });
});
