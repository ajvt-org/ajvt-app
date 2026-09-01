import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { rejectionOf } from "@tests/schema";
import { suspensionCreateSchema, suspensionDecideSchema } from "./schema";

const VALID = { memberId: "u1", scope: "MATCHES", matches: 2 };

describe("suspensionCreateSchema", () => {
  it("accepts a suspension over a number of matches", () => {
    expect(parse(suspensionCreateSchema, VALID)).toMatchObject(VALID);
  });

  it("names the value when the scope is one it does not know", () => {
    expect(rejectionOf(suspensionCreateSchema, { ...VALID, scope: "FOREVER" })).toBe(
      "قيمة غير صالحة",
    );
  });

  it("refuses a field it was not given", () => {
    expect(rejectionOf(suspensionCreateSchema, { ...VALID, reason: "لا شيء" })).toBeTruthy();
  });
});

describe("suspensionDecideSchema", () => {
  it("accepts a decision", () => {
    expect(parse(suspensionDecideSchema, { approve: true })).toEqual({ approve: true });
  });

  it("names the value when the decision is not a boolean", () => {
    expect(rejectionOf(suspensionDecideSchema, { approve: "yes" })).toBe("قيمة غير صالحة");
  });
});
