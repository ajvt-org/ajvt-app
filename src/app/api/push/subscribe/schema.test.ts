import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { pushSubscribeSchema } from "./schema";
import { rejectionOf } from "@tests/schema";

const valid = { endpoint: "https://push.example/1", keys: { p256dh: "k", auth: "a" } };

describe("pushSubscribeSchema", () => {
  it("accepts a browser subscription", () => {
    expect(parse(pushSubscribeSchema, valid)).toEqual(valid);
  });

  it("rejects a missing endpoint", () => {
    expect(rejectionOf(pushSubscribeSchema, { keys: valid.keys })).toBe("بيانات غير صالحة");
  });

  it("rejects an empty endpoint", () => {
    expect(rejectionOf(pushSubscribeSchema, { ...valid, endpoint: "" })).toBe("بيانات غير صالحة");
  });

  it("rejects missing keys", () => {
    expect(rejectionOf(pushSubscribeSchema, { endpoint: valid.endpoint })).toBe("بيانات غير صالحة");
  });

  it("rejects a subscription without p256dh", () => {
    expect(rejectionOf(pushSubscribeSchema, { ...valid, keys: { auth: "a" } })).toBe(
      "بيانات غير صالحة",
    );
  });

  it("rejects a subscription without auth", () => {
    expect(rejectionOf(pushSubscribeSchema, { ...valid, keys: { p256dh: "k" } })).toBe(
      "بيانات غير صالحة",
    );
  });
});
