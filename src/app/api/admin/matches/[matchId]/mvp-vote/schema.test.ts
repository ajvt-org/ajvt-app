import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { rejectionOf } from "@tests/schema";
import { mvpVoteCreateSchema, mvpVoteStatusSchema } from "./schema";

const COUNT = "يجب اختيار بين 2 و6 لاعبين مرشحين";

describe("mvpVoteCreateSchema", () => {
  it("accepts two candidates", () => {
    expect(parse(mvpVoteCreateSchema, { candidateMemberIds: ["a", "b"] })).toEqual({
      candidateMemberIds: ["a", "b"],
    });
  });

  it("accepts six candidates", () => {
    const ids = ["a", "b", "c", "d", "e", "f"];
    expect(parse(mvpVoteCreateSchema, { candidateMemberIds: ids }).candidateMemberIds).toEqual(ids);
  });

  it("rejects a single candidate", () => {
    expect(rejectionOf(mvpVoteCreateSchema, { candidateMemberIds: ["a"] })).toBe(COUNT);
  });

  it("rejects seven candidates", () => {
    expect(
      rejectionOf(mvpVoteCreateSchema, { candidateMemberIds: ["a", "b", "c", "d", "e", "f", "g"] }),
    ).toBe(COUNT);
  });

  it("rejects a list that is not a list", () => {
    expect(rejectionOf(mvpVoteCreateSchema, { candidateMemberIds: "a" })).toBe(COUNT);
  });

  it("rejects a missing list", () => {
    expect(rejectionOf(mvpVoteCreateSchema, {})).toBe(COUNT);
  });

  it("rejects the same player twice", () => {
    expect(rejectionOf(mvpVoteCreateSchema, { candidateMemberIds: ["a", "a"] })).toBe(
      "لا يمكن اختيار نفس اللاعب مرتين",
    );
  });
});

describe("mvpVoteStatusSchema", () => {
  it("opens a vote", () => {
    expect(parse(mvpVoteStatusSchema, { status: "OPEN" }).status).toBe("OPEN");
  });

  it("closes a vote", () => {
    expect(parse(mvpVoteStatusSchema, { status: "CLOSED" }).status).toBe("CLOSED");
  });

  it("rejects a status it does not know", () => {
    expect(rejectionOf(mvpVoteStatusSchema, { status: "PAUSED" })).toBe("بيانات غير صالحة");
  });

  it("rejects a missing status", () => {
    expect(rejectionOf(mvpVoteStatusSchema, {})).toBe("بيانات غير صالحة");
  });
});
