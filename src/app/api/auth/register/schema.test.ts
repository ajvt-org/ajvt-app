import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { registerSchema } from "./schema";
import { rejectionOf } from "@tests/schema";
import { HOME_VILLAGE, OTHER_VILLAGE } from "@/lib/villages";

const person = { fullName: "محمد ولد أحمد", village: HOME_VILLAGE, age: "البدريين" };

describe("registerSchema", () => {
  it("accepts credentials and the person they belong to", () => {
    expect(parse(registerSchema, { phone: "22334455", password: "12345678", ...person })).toEqual({
      phone: "22334455",
      password: "12345678",
      ...person,
    });
  });

  it("trims the phone the way the route stores it", () => {
    expect(
      parse(registerSchema, { phone: " 22334455 ", password: "12345678", ...person }).phone,
    ).toBe("22334455");
  });

  it("files a sign-up under the home village when none is named", () => {
    const { village: _village, ...rest } = person;
    void _village;

    expect(
      parse(registerSchema, { phone: "22334455", password: "12345678", ...rest }).village,
    ).toBe(HOME_VILLAGE);
  });

  it("rejects a name that is not written in arabic", () => {
    expect(
      rejectionOf(registerSchema, {
        phone: "22334455",
        password: "12345678",
        ...person,
        fullName: "Mohamed",
      }),
    ).toBe("الاسم الكامل يجب أن يكون بالحروف العربية فقط");
  });

  it("rejects the home village with no age group", () => {
    expect(
      rejectionOf(registerSchema, {
        phone: "22334455",
        password: "12345678",
        ...person,
        age: null,
      }),
    ).toBe("يرجى اختيار العصر");
  });

  it("takes another village with no age group", () => {
    expect(
      parse(registerSchema, {
        phone: "22334455",
        password: "12345678",
        ...person,
        village: OTHER_VILLAGE,
        age: null,
      }).village,
    ).toBe(OTHER_VILLAGE);
  });

  it("rejects a seven character password with the floor spelled out", () => {
    expect(rejectionOf(registerSchema, { phone: "22334455", password: "1234567", ...person })).toBe(
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
    expect(
      rejectionOf(registerSchema, { phone: "12345678", password: "12345678", ...person }),
    ).toBe("يجب أن يبدأ الرقم بـ 2 أو 3 أو 4");
    expect(rejectionOf(registerSchema, { phone: "223344", password: "12345678", ...person })).toBe(
      "يجب أن يكون رقم الهاتف 8 أرقام بالضبط",
    );
  });
});
