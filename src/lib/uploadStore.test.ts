import { describe, it, expect } from "vitest";
import { uploadStoreIsMissing } from "./uploadStore";

describe("uploadStoreIsMissing", () => {
  it("is missing when the database references files the directory does not hold", () => {
    expect(uploadStoreIsMissing({ files: 0, stored: 205 })).toBe(true);
  });

  it("is not missing on a fresh install with nothing stored either side", () => {
    expect(uploadStoreIsMissing({ files: 0, stored: 0 })).toBe(false);
  });

  it("is not missing once the directory holds anything", () => {
    expect(uploadStoreIsMissing({ files: 1, stored: 205 })).toBe(false);
  });
});
