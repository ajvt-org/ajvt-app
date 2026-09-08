import { describe, it, expect } from "vitest";
import { MAX_UPLOAD_SIZE } from "./uploadLimits";
import { MAX_UPLOAD_REQUEST_SIZE, declaredBodyTooLarge } from "./uploadRequestSize";

describe("declaredBodyTooLarge", () => {
  it("holds for a body larger than a file at the limit plus its envelope", () => {
    expect(declaredBodyTooLarge(String(MAX_UPLOAD_REQUEST_SIZE + 1))).toBe(true);
  });

  it("leaves room for the multipart envelope around a file at the limit", () => {
    expect(declaredBodyTooLarge(String(MAX_UPLOAD_SIZE))).toBe(false);
    expect(declaredBodyTooLarge(String(MAX_UPLOAD_REQUEST_SIZE))).toBe(false);
  });

  it("does not hold for an ordinary body", () => {
    expect(declaredBodyTooLarge("2048")).toBe(false);
  });

  it("does not hold when the caller declares no length", () => {
    expect(declaredBodyTooLarge(null)).toBe(false);
    expect(declaredBodyTooLarge("")).toBe(false);
  });

  it("does not hold for a length that is not a number", () => {
    expect(declaredBodyTooLarge("plenty")).toBe(false);
  });
});
