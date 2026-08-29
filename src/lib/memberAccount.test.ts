import { describe, it, expect, vi } from "vitest";
import { accountsFor } from "./memberAccount";

function db(rows: { id: string; userId: string }[]) {
  return {
    member: { findMany: vi.fn().mockResolvedValue(rows) },
  } as unknown as Parameters<typeof accountsFor>[0];
}

describe("the accounts behind a set of members", () => {
  it("maps every member onto their account", async () => {
    const map = await accountsFor(db([{ id: "m1", userId: "u1" }]), ["m1"]);

    expect(map.get("m1")).toBe("u1");
  });

  it("asks for nothing when given nothing", async () => {
    const fake = db([]);

    expect((await accountsFor(fake, [])).size).toBe(0);
    expect(
      (fake as unknown as { member: { findMany: ReturnType<typeof vi.fn> } }).member.findMany,
    ).not.toHaveBeenCalled();
  });

  it("asks once for a member named twice", async () => {
    const fake = db([{ id: "m1", userId: "u1" }]);

    await accountsFor(fake, ["m1", "m1"]);

    const call = (fake as unknown as { member: { findMany: ReturnType<typeof vi.fn> } }).member
      .findMany.mock.calls[0][0];
    expect(call.where.id.in).toEqual(["m1"]);
  });

  it("leaves a member it never found out of the map", async () => {
    const map = await accountsFor(db([]), ["ghost"]);

    expect(map.has("ghost")).toBe(false);
  });
});
