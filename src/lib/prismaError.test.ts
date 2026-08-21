import { describe, it, expect } from "vitest";
import { isForeignKeyViolation, isUniqueViolation, uniqueViolationFields } from "./prismaError";

describe("isForeignKeyViolation", () => {
  it("recognises a prisma foreign key refusal", () => {
    expect(isForeignKeyViolation({ code: "P2003" })).toBe(true);
  });

  it("ignores a unique clash and other prisma errors", () => {
    expect(isForeignKeyViolation({ code: "P2002" })).toBe(false);
    expect(isForeignKeyViolation({ code: "P2025" })).toBe(false);
  });

  it("ignores plain errors and nullish values", () => {
    expect(isForeignKeyViolation(new Error("boom"))).toBe(false);
    expect(isForeignKeyViolation(null)).toBe(false);
    expect(isForeignKeyViolation("P2003")).toBe(false);
  });
});

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

describe("uniqueViolationFields", () => {
  it("names the fields prisma reports", () => {
    expect(uniqueViolationFields({ code: "P2002", meta: { target: ["userId"] } })).toEqual([
      "userId",
    ]);
  });

  it("takes a bare string target as one field", () => {
    expect(uniqueViolationFields({ code: "P2002", meta: { target: "referenceCode" } })).toEqual([
      "referenceCode",
    ]);
  });

  it("is empty when the error is not a unique clash or carries no target", () => {
    expect(uniqueViolationFields({ code: "P2025", meta: { target: ["userId"] } })).toEqual([]);
    expect(uniqueViolationFields({ code: "P2002" })).toEqual([]);
    expect(uniqueViolationFields(null)).toEqual([]);
  });
});
