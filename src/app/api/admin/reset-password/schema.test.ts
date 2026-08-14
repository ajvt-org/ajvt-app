import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { rejectionOf } from "@tests/schema";
import { resetPasswordSchema } from "./schema";

describe("resetPasswordSchema", () => {
  it("accepts a user", () => {
    expect(parse(resetPasswordSchema, { userId: "u1" })).toEqual({ userId: "u1" });
  });

  it("rejects a missing user", () => {
    expect(rejectionOf(resetPasswordSchema, {})).toBe("بيانات غير صالحة");
  });

  it("rejects an empty user id", () => {
    expect(rejectionOf(resetPasswordSchema, { userId: "" })).toBe("بيانات غير صالحة");
  });
});
