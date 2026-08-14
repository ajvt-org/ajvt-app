import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { rejectionOf } from "@tests/schema";
import { activityRegisterSchema } from "./schema";

describe("activityRegisterSchema", () => {
  it("accepts an activity and a member", () => {
    expect(parse(activityRegisterSchema, { activityId: "a1", memberId: "m1" })).toEqual({
      activityId: "a1",
      memberId: "m1",
    });
  });

  it("rejects a missing activity", () => {
    expect(rejectionOf(activityRegisterSchema, { memberId: "m1" })).toBe("بيانات غير صالحة");
  });

  it("rejects a missing member", () => {
    expect(rejectionOf(activityRegisterSchema, { activityId: "a1" })).toBe("بيانات غير صالحة");
  });

  it("rejects an empty member id", () => {
    expect(rejectionOf(activityRegisterSchema, { activityId: "a1", memberId: "" })).toBe(
      "بيانات غير صالحة",
    );
  });
});
