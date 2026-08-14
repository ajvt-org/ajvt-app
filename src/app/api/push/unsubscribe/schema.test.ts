import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { pushUnsubscribeSchema } from "./schema";
import { rejectionOf } from "@tests/schema";

describe("pushUnsubscribeSchema", () => {
  it("accepts an endpoint", () => {
    expect(parse(pushUnsubscribeSchema, { endpoint: "https://push.example/1" })).toEqual({
      endpoint: "https://push.example/1",
    });
  });

  it("rejects a missing endpoint", () => {
    expect(rejectionOf(pushUnsubscribeSchema, {})).toBe("بيانات غير صالحة");
  });

  it("rejects an empty endpoint", () => {
    expect(rejectionOf(pushUnsubscribeSchema, { endpoint: "" })).toBe("بيانات غير صالحة");
  });
});
