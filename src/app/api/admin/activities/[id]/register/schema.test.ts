import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { rejectionOf } from "@tests/schema";
import { adminRegisterSchema, registrationReviewSchema } from "./schema";

describe("adminRegisterSchema", () => {
  it("accepts an account", () => {
    expect(parse(adminRegisterSchema, { userId: "u1" })).toEqual({ userId: "u1" });
  });

  it("rejects a missing account", () => {
    expect(rejectionOf(adminRegisterSchema, {})).toBe("بيانات غير صالحة");
  });

  it("rejects an empty account id", () => {
    expect(rejectionOf(adminRegisterSchema, { userId: "" })).toBe("بيانات غير صالحة");
  });

  it("refuses the old memberId name rather than reading it", () => {
    expect(rejectionOf(adminRegisterSchema, { memberId: "u1" })).toBe("بيانات غير صالحة");
  });
});

describe("registrationReviewSchema", () => {
  it("approves a registration", () => {
    expect(
      parse(registrationReviewSchema, { registrationId: "r1", status: "ACTIVE" }),
    ).toMatchObject({ registrationId: "r1", status: "ACTIVE" });
  });

  it("rejects a registration with a reason", () => {
    const parsed = parse(registrationReviewSchema, {
      registrationId: "r1",
      status: "REJECTED",
      reason: "اكتمل العدد",
    });
    expect(parsed.reason).toBe("اكتمل العدد");
  });

  it("rejects a missing registration", () => {
    expect(rejectionOf(registrationReviewSchema, { status: "ACTIVE" })).toBe("بيانات غير صالحة");
  });

  it("rejects a status it does not know", () => {
    expect(rejectionOf(registrationReviewSchema, { registrationId: "r1", status: "PENDING" })).toBe(
      "بيانات غير صالحة",
    );
  });

  it("rejects a reason over three hundred characters", () => {
    expect(
      rejectionOf(registrationReviewSchema, {
        registrationId: "r1",
        status: "REJECTED",
        reason: "ا".repeat(301),
      }),
    ).toBe("النص طويل جداً (300 حرف كحد أقصى)");
  });

  it("accepts a reason of exactly three hundred characters", () => {
    const parsed = parse(registrationReviewSchema, {
      registrationId: "r1",
      status: "REJECTED",
      reason: "ا".repeat(300),
    });
    expect(parsed.reason).toHaveLength(300);
  });
});
