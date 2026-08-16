import { describe, it, expect } from "vitest";
import { memberPhone } from "./memberPhone";

describe("memberPhone", () => {
  it("takes the account number", () => {
    expect(memberPhone({ phone: "22334455", user: { phone: "33445566" } })).toBe("33445566");
  });

  it("falls back to the copy for a member with no account", () => {
    expect(memberPhone({ phone: "22334455", user: null })).toBe("22334455");
  });

  it("is null when neither is known", () => {
    expect(memberPhone({ phone: null, user: null })).toBeNull();
    expect(memberPhone({})).toBeNull();
  });
});
