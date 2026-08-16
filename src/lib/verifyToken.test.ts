import { describe, it, expect } from "vitest";
import { generateVerifyToken } from "@/lib/verifyToken";

describe("generateVerifyToken", () => {
  it("is long enough that guessing one is not worth trying", () => {
    expect(generateVerifyToken()).toMatch(/^[0-9a-f]{32}$/);
  });

  it("does not repeat", () => {
    const seen = new Set(Array.from({ length: 500 }, () => generateVerifyToken()));
    expect(seen.size).toBe(500);
  });

  it("carries no order, unlike the member number it replaced in the QR", () => {
    const first = generateVerifyToken();
    const second = generateVerifyToken();
    expect(second).not.toBe(first);
    expect(Number.isNaN(Number(first)) || first !== String(Number(second) - 1)).toBe(true);
  });
});
