import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { rejectionOf } from "@tests/schema";
import { memberPhotoSchema } from "./schema";

describe("memberPhotoSchema", () => {
  it("accepts a filename", () => {
    expect(parse(memberPhotoSchema, { photo: "a.webp" })).toEqual({ photo: "a.webp" });
  });

  it("accepts null, which removes the photo", () => {
    expect(parse(memberPhotoSchema, { photo: null }).photo).toBeNull();
  });

  it("rejects a missing photo, since the route only sets this field", () => {
    expect(rejectionOf(memberPhotoSchema, {})).toBe("بيانات غير صالحة");
  });

  it("rejects a photo that is not a filename", () => {
    expect(rejectionOf(memberPhotoSchema, { photo: 7 })).toBe("بيانات غير صالحة");
  });
});
