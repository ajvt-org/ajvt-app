import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { rejectionOf } from "@tests/schema";
import { teamMemberSchema } from "./schema";

describe("teamMemberSchema", () => {
  it("accepts an account", () => {
    expect(parse(teamMemberSchema, { userId: "u1" })).toEqual({ userId: "u1" });
  });

  it("rejects a missing account", () => {
    expect(rejectionOf(teamMemberSchema, {})).toBe("بيانات غير صالحة");
  });

  it("rejects an empty account id", () => {
    expect(rejectionOf(teamMemberSchema, { userId: "" })).toBe("بيانات غير صالحة");
  });

  it("refuses the old memberId name rather than reading it", () => {
    expect(rejectionOf(teamMemberSchema, { memberId: "u1" })).toBe("بيانات غير صالحة");
  });
});
