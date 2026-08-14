import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { rejectionOf } from "@tests/schema";
import { broadcastSchema } from "./schema";

const valid = { target: "ALL", title: "إعلان", body: "نص الإعلان" };

describe("broadcastSchema", () => {
  it("accepts a broadcast to everyone", () => {
    expect(parse(broadcastSchema, valid).target).toBe("ALL");
  });

  it("rejects a target it does not know", () => {
    expect(rejectionOf(broadcastSchema, { ...valid, target: "TEAM" })).toBe("بيانات غير صالحة");
  });

  it("rejects a missing title", () => {
    expect(rejectionOf(broadcastSchema, { target: "ALL", body: "نص" })).toBe(
      "العنوان والنص مطلوبان",
    );
  });

  it("rejects a blank body", () => {
    expect(rejectionOf(broadcastSchema, { ...valid, body: "   " })).toBe("العنوان والنص مطلوبان");
  });

  it("rejects a title over sixty characters", () => {
    expect(rejectionOf(broadcastSchema, { ...valid, title: "ا".repeat(61) })).toBe(
      "النص طويل جداً",
    );
  });

  it("rejects a body over three hundred characters", () => {
    expect(rejectionOf(broadcastSchema, { ...valid, body: "ا".repeat(301) })).toBe(
      "النص طويل جداً",
    );
  });

  it("asks for an activity when the target is an activity", () => {
    expect(rejectionOf(broadcastSchema, { ...valid, target: "ACTIVITY" })).toBe(
      "يرجى اختيار النشاط",
    );
  });

  it("accepts an activity broadcast that names one", () => {
    const parsed = parse(broadcastSchema, { ...valid, target: "ACTIVITY", activityId: "a1" });
    expect(parsed.activityId).toBe("a1");
  });

  it("asks for an age group when the target is an age group", () => {
    expect(rejectionOf(broadcastSchema, { ...valid, target: "AGE" })).toBe("يرجى اختيار العصر");
  });

  it("rejects an age group that is only spaces", () => {
    expect(rejectionOf(broadcastSchema, { ...valid, target: "AGE", age: "  " })).toBe(
      "يرجى اختيار العصر",
    );
  });
});
