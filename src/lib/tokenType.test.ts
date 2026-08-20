import { describe, it, expect } from "vitest";
import { isTokenOf } from "./tokenType";

describe("isTokenOf", () => {
  it("accepts a payload stamped with the asked-for type", () => {
    expect(isTokenOf({ typ: "admin", adminId: "a1" }, "admin")).toBe(true);
    expect(isTokenOf({ typ: "user", userId: "u1" }, "user")).toBe(true);
  });

  it("treats the other type as absent, not as an error", () => {
    expect(isTokenOf({ typ: "user", userId: "u1" }, "admin")).toBe(false);
    expect(isTokenOf({ typ: "admin", adminId: "a1" }, "user")).toBe(false);
  });

  it("treats a payload from before the claim existed as absent", () => {
    expect(isTokenOf({ userId: "u1", tokenVersion: 0 }, "user")).toBe(false);
    expect(isTokenOf({ adminId: "a1" }, "admin")).toBe(false);
  });

  it("handles a missing payload", () => {
    expect(isTokenOf(null, "user")).toBe(false);
    expect(isTokenOf(undefined, "admin")).toBe(false);
  });

  it("refuses a forged claim that is not exactly the string", () => {
    expect(isTokenOf({ typ: ["admin"] }, "admin")).toBe(false);
    expect(isTokenOf({ typ: "ADMIN" }, "admin")).toBe(false);
  });
});
