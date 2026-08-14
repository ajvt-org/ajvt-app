import { describe, it, expect } from "vitest";
import { isUniqueViolation } from "./prismaError";

describe("isUniqueViolation", () => {
  it("recognises a prisma unique clash", () => {
    expect(isUniqueViolation({ code: "P2002" })).toBe(true);
  });

  it("ignores other prisma errors", () => {
    expect(isUniqueViolation({ code: "P2025" })).toBe(false);
  });

  it("ignores plain errors and nullish values", () => {
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    expect(isUniqueViolation("P2002")).toBe(false);
  });
});
