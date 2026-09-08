import { describe, it, expect } from "vitest";
import {
  ACCEPTED_UPLOAD_TYPES,
  CONVERTED_UPLOAD_TYPES,
  READABLE_UPLOAD_TYPES,
  serverCanRead,
} from "./uploadLimits";

describe("what an upload may be", () => {
  it("takes every readable format and every one the browser converts", () => {
    for (const type of [...READABLE_UPLOAD_TYPES, ...CONVERTED_UPLOAD_TYPES]) {
      expect(ACCEPTED_UPLOAD_TYPES).toContain(type);
    }
  });

  it("never calls a converted format readable", () => {
    for (const type of CONVERTED_UPLOAD_TYPES) {
      expect(serverCanRead(type)).toBe(false);
    }
  });

  it("keeps a converted format out of what the routes let through", () => {
    for (const type of CONVERTED_UPLOAD_TYPES) {
      expect(READABLE_UPLOAD_TYPES).not.toContain(type);
    }
  });

  it("reads the four the processor decodes, whatever the case", () => {
    expect(serverCanRead("image/jpeg")).toBe(true);
    expect(serverCanRead("IMAGE/PNG")).toBe(true);
    expect(serverCanRead("image/webp")).toBe(true);
    expect(serverCanRead("application/pdf")).toBe(false);
  });
});
