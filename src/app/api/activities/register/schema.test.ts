import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { rejectionOf } from "@tests/schema";
import { activityRegisterSchema } from "./schema";

describe("activityRegisterSchema", () => {
  it("accepts an activity and a member", () => {
    expect(parse(activityRegisterSchema, { activityId: "a1", userId: "u1" })).toEqual({
      activityId: "a1",
      userId: "u1",
    });
  });

  it("rejects a missing activity", () => {
    expect(rejectionOf(activityRegisterSchema, { userId: "u1" })).toBe("بيانات غير صالحة");
  });

  it("rejects a missing member", () => {
    expect(rejectionOf(activityRegisterSchema, { activityId: "a1" })).toBe("بيانات غير صالحة");
  });

  it("rejects an empty member id", () => {
    expect(rejectionOf(activityRegisterSchema, { activityId: "a1", userId: "" })).toBe(
      "بيانات غير صالحة",
    );
  });

  it("refuses the old memberId name rather than reading it", () => {
    expect(rejectionOf(activityRegisterSchema, { activityId: "a1", memberId: "u1" })).toBe(
      "بيانات غير صالحة",
    );
  });
});
