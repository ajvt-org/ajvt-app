import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { rejectionOf } from "@tests/schema";
import { teamMemberSchema } from "./schema";

describe("teamMemberSchema", () => {
  it("accepts a member", () => {
    expect(parse(teamMemberSchema, { memberId: "m1" })).toEqual({ memberId: "m1" });
  });

  it("rejects a missing member", () => {
    expect(rejectionOf(teamMemberSchema, {})).toBe("بيانات غير صالحة");
  });

  it("rejects an empty member id", () => {
    expect(rejectionOf(teamMemberSchema, { memberId: "" })).toBe("بيانات غير صالحة");
  });
});
