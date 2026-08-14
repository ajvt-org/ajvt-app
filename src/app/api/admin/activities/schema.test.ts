import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { rejectionOf } from "@tests/schema";
import { activityCreateSchema } from "./schema";

const valid = { title: "دوري الحي", description: "بطولة صيفية" };

describe("activityCreateSchema", () => {
  it("accepts a title and a description", () => {
    const parsed = parse(activityCreateSchema, valid);
    expect(parsed.title).toBe("دوري الحي");
    expect(parsed.description).toBe("بطولة صيفية");
  });

  it("trims what the admin typed", () => {
    expect(
      parse(activityCreateSchema, { title: "  دوري  ", description: "  وصف  " }),
    ).toMatchObject({ title: "دوري", description: "وصف" });
  });

  it("rejects a missing title", () => {
    expect(rejectionOf(activityCreateSchema, { description: "وصف" })).toBe(
      "العنوان والوصف مطلوبان",
    );
  });

  it("rejects a missing description", () => {
    expect(rejectionOf(activityCreateSchema, { title: "دوري" })).toBe("العنوان والوصف مطلوبان");
  });

  it("rejects a title that is only spaces", () => {
    expect(rejectionOf(activityCreateSchema, { ...valid, title: "   " })).toBe(
      "العنوان والوصف مطلوبان",
    );
  });

  it("rejects a title over sixty characters", () => {
    expect(rejectionOf(activityCreateSchema, { ...valid, title: "ا".repeat(61) })).toBe(
      "العنوان طويل جداً (60 حرفاً كحد أقصى)",
    );
  });

  it("accepts a title of exactly sixty characters", () => {
    expect(parse(activityCreateSchema, { ...valid, title: "ا".repeat(60) }).title).toHaveLength(60);
  });

  it("rejects a description over a thousand characters", () => {
    expect(rejectionOf(activityCreateSchema, { ...valid, description: "ا".repeat(1001) })).toBe(
      "الوصف طويل جداً (1000 حرف كحد أقصى)",
    );
  });

  it("rejects a title that is not text", () => {
    expect(rejectionOf(activityCreateSchema, { ...valid, title: 7 })).toBe(
      "العنوان والوصف مطلوبان",
    );
  });

  it("rejects a photo that is not a filename", () => {
    expect(rejectionOf(activityCreateSchema, { ...valid, photo: 7 })).toBe("بيانات غير صالحة");
  });

  it("reads a capacity typed into a number field", () => {
    expect(parse(activityCreateSchema, { ...valid, capacity: "30" }).capacity).toBe(30);
  });

  it("treats an empty capacity as no limit", () => {
    expect(parse(activityCreateSchema, { ...valid, capacity: "" }).capacity).toBeNull();
  });

  it("treats a null capacity as no limit", () => {
    expect(parse(activityCreateSchema, { ...valid, capacity: null }).capacity).toBeNull();
  });

  it("rejects a capacity of zero", () => {
    expect(rejectionOf(activityCreateSchema, { ...valid, capacity: 0 })).toBe(
      "السعة يجب أن تكون رقماً صحيحاً موجباً",
    );
  });

  it("rejects a negative capacity", () => {
    expect(rejectionOf(activityCreateSchema, { ...valid, capacity: -5 })).toBe(
      "السعة يجب أن تكون رقماً صحيحاً موجباً",
    );
  });

  it("rejects a fractional capacity", () => {
    expect(rejectionOf(activityCreateSchema, { ...valid, capacity: 2.5 })).toBe(
      "السعة يجب أن تكون رقماً صحيحاً موجباً",
    );
  });
});
