import { describe, it, expect } from "vitest";
import { isAnonymousOwner, uploadOwnerOf } from "./uploadOwner";

describe("uploadOwnerOf", () => {
  it("reads the member id from a member session", () => {
    expect(uploadOwnerOf(null, { typ: "user", userId: "u1" })).toEqual({
      userId: "u1",
      adminId: null,
    });
  });

  it("reads the admin id from an admin session", () => {
    expect(uploadOwnerOf({ typ: "admin", adminId: "a1" }, null)).toEqual({
      userId: null,
      adminId: "a1",
    });
  });

  it("keeps both when the same request carries both sessions", () => {
    expect(uploadOwnerOf({ adminId: "a1" }, { userId: "u1" })).toEqual({
      userId: "u1",
      adminId: "a1",
    });
  });

  it("names nobody when a session carries no id", () => {
    expect(uploadOwnerOf({}, { userId: 7 })).toEqual({ userId: null, adminId: null });
  });

  it("names nobody for a caller with no session at all", () => {
    const owner = uploadOwnerOf(null, null);

    expect(owner).toEqual({ userId: null, adminId: null });
    expect(isAnonymousOwner(owner)).toBe(true);
  });

  it("does not read a signed in caller as anonymous", () => {
    expect(isAnonymousOwner(uploadOwnerOf(null, { userId: "u1" }))).toBe(false);
  });
});
