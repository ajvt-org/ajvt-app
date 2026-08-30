import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { rejectionOf } from "@tests/schema";
import { activityUpdateSchema } from "./schema";

describe("activityUpdateSchema", () => {
  it("accepts an empty patch, since every field is optional", () => {
    expect(parse(activityUpdateSchema, {})).toEqual({});
  });

  it("accepts a title on its own", () => {
    expect(parse(activityUpdateSchema, { title: "دوري جديد" }).title).toBe("دوري جديد");
  });

  it("names the title alone when it is blank, unlike the create form", () => {
    expect(rejectionOf(activityUpdateSchema, { title: "  " })).toBe("العنوان مطلوب");
  });

  it("names the description alone when it is blank", () => {
    expect(rejectionOf(activityUpdateSchema, { description: "" })).toBe("الوصف مطلوب");
  });

  it("rejects a title over sixty characters", () => {
    expect(rejectionOf(activityUpdateSchema, { title: "ا".repeat(61) })).toBe(
      "العنوان طويل جداً (60 حرفاً كحد أقصى)",
    );
  });

  it("clears the capacity when it is set to null", () => {
    expect(parse(activityUpdateSchema, { capacity: null }).capacity).toBeNull();
  });

  it("rejects a capacity of zero", () => {
    expect(rejectionOf(activityUpdateSchema, { capacity: 0 })).toBe(
      "السعة يجب أن تكون رقماً صحيحاً موجباً",
    );
  });

  it("accepts a reordering", () => {
    expect(parse(activityUpdateSchema, { order: 3 }).order).toBe(3);
  });

  it("rejects an order that is not a whole number", () => {
    expect(rejectionOf(activityUpdateSchema, { order: "third" })).toBe("بيانات غير صالحة");
  });

  it("carries the scorers and cards toggle", () => {
    expect(parse(activityUpdateSchema, { showScorersAndCards: false }).showScorersAndCards).toBe(
      false,
    );
  });
});
