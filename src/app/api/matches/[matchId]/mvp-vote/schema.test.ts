import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { rejectionOf } from "@tests/schema";
import { mvpVoteCastSchema } from "./schema";

describe("mvpVoteCastSchema", () => {
  it("accepts a candidate", () => {
    expect(parse(mvpVoteCastSchema, { candidateId: "c1" })).toEqual({ candidateId: "c1" });
  });

  it("rejects a missing candidate", () => {
    expect(rejectionOf(mvpVoteCastSchema, {})).toBe("بيانات غير صالحة");
  });

  it("rejects an empty candidate id", () => {
    expect(rejectionOf(mvpVoteCastSchema, { candidateId: "" })).toBe("بيانات غير صالحة");
  });
});
