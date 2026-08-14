import { describe, it, expect } from "vitest";
import { generateReferenceCode, isValidReferenceCode } from "./referenceCode";

describe("generateReferenceCode", () => {
  it("produces codes in the AJ- shape", () => {
    for (let i = 0; i < 200; i++) {
      expect(isValidReferenceCode(generateReferenceCode())).toBe(true);
    }
  });

  it("avoids characters that are easy to misread when hand-copied", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateReferenceCode().slice(3)).not.toMatch(/[01OIL]/);
    }
  });

  it("does not keep returning the same code", () => {
    const seen = new Set(Array.from({ length: 50 }, () => generateReferenceCode()));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe("isValidReferenceCode", () => {
  it("accepts a well-formed code", () => {
    expect(isValidReferenceCode("AJ-ABCDE")).toBe(true);
    expect(isValidReferenceCode("AJ-23456")).toBe(true);
  });

  it("rejects the wrong prefix, length, case or alphabet", () => {
    expect(isValidReferenceCode("XX-ABCDE")).toBe(false);
    expect(isValidReferenceCode("AJ-ABCD")).toBe(false);
    expect(isValidReferenceCode("AJ-ABCDEF")).toBe(false);
    expect(isValidReferenceCode("AJ-abcde")).toBe(false);
    expect(isValidReferenceCode("AJ-A1CDE")).toBe(false);
    expect(isValidReferenceCode("AJ-A0CDE")).toBe(false);
  });

  it("rejects anything that is not a string", () => {
    expect(isValidReferenceCode(null)).toBe(false);
    expect(isValidReferenceCode(undefined)).toBe(false);
    expect(isValidReferenceCode(12345)).toBe(false);
    expect(isValidReferenceCode({})).toBe(false);
  });
});
