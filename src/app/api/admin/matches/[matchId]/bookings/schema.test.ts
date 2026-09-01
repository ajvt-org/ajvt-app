import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { rejectionOf } from "@tests/schema";
import { bookingCreateSchema } from "./schema";

const valid = { userId: "u1", teamId: "t1", cardType: "YELLOW" };

describe("bookingCreateSchema", () => {
  it("accepts a card without a minute", () => {
    expect(parse(bookingCreateSchema, valid)).toEqual({ ...valid, minute: undefined });
  });

  it("keeps a minute that was given", () => {
    expect(parse(bookingCreateSchema, { ...valid, minute: 45 }).minute).toBe(45);
  });

  it("takes a minute typed into a text field", () => {
    expect(parse(bookingCreateSchema, { ...valid, minute: "45" }).minute).toBe(45);
  });

  it("treats an empty field as no minute", () => {
    expect(parse(bookingCreateSchema, { ...valid, minute: "" }).minute).toBeNull();
  });

  it("treats a null minute as no minute", () => {
    expect(parse(bookingCreateSchema, { ...valid, minute: null }).minute).toBeNull();
  });

  it("accepts a red card", () => {
    expect(parse(bookingCreateSchema, { ...valid, cardType: "RED" }).cardType).toBe("RED");
  });

  it("rejects a card type it does not know", () => {
    expect(rejectionOf(bookingCreateSchema, { ...valid, cardType: "ORANGE" })).toBe(
      "بيانات غير صالحة",
    );
  });

  it("rejects a missing member", () => {
    expect(rejectionOf(bookingCreateSchema, { teamId: "t1", cardType: "RED" })).toBe(
      "بيانات غير صالحة",
    );
  });

  it("rejects a missing team", () => {
    expect(rejectionOf(bookingCreateSchema, { userId: "u1", cardType: "RED" })).toBe(
      "بيانات غير صالحة",
    );
  });

  it("rejects a minute before kickoff", () => {
    expect(rejectionOf(bookingCreateSchema, { ...valid, minute: 0 })).toBe(
      "الدقيقة يجب أن تكون رقماً صحيحاً بين 1 و130",
    );
  });

  it("rejects a minute past the longest possible match", () => {
    expect(rejectionOf(bookingCreateSchema, { ...valid, minute: 131 })).toBe(
      "الدقيقة يجب أن تكون رقماً صحيحاً بين 1 و130",
    );
  });

  it("rejects a fractional minute", () => {
    expect(rejectionOf(bookingCreateSchema, { ...valid, minute: 45.5 })).toBe(
      "الدقيقة يجب أن تكون رقماً صحيحاً بين 1 و130",
    );
  });

  it("rejects a minute that is not a number", () => {
    expect(rejectionOf(bookingCreateSchema, { ...valid, minute: "later" })).toBe(
      "الدقيقة يجب أن تكون رقماً صحيحاً بين 1 و130",
    );
  });
});
