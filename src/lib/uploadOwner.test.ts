import { describe, it, expect } from "vitest";
import { isAnonymousOwner, ownsUpload, uploadOwnerOf } from "./uploadOwner";

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

describe("ownsUpload", () => {
  const member = { userId: "u1", adminId: null };
  const admin = { userId: null, adminId: "a1" };

  it("holds for the member who made the upload", () => {
    expect(ownsUpload({ uploadedByUserId: "u1", uploadedByAdminId: null }, member)).toBe(true);
  });

  it("holds for the admin who made the upload", () => {
    expect(ownsUpload({ uploadedByUserId: null, uploadedByAdminId: "a1" }, admin)).toBe(true);
  });

  it("does not hold for another member", () => {
    expect(ownsUpload({ uploadedByUserId: "u2", uploadedByAdminId: null }, member)).toBe(false);
  });

  it("does not hold for another admin", () => {
    expect(ownsUpload({ uploadedByUserId: null, uploadedByAdminId: "a2" }, admin)).toBe(false);
  });

  it("does not let an admin claim a member upload, or a member an admin one", () => {
    expect(ownsUpload({ uploadedByUserId: "u1", uploadedByAdminId: null }, admin)).toBe(false);
    expect(ownsUpload({ uploadedByUserId: null, uploadedByAdminId: "a1" }, member)).toBe(false);
  });

  it("does not hold when there is no record of the upload", () => {
    expect(ownsUpload(null, member)).toBe(false);
  });

  it("does not hold for a caller with no session, whatever the record says", () => {
    const anonymous = { userId: null, adminId: null };

    expect(ownsUpload({ uploadedByUserId: null, uploadedByAdminId: null }, anonymous)).toBe(false);
    expect(ownsUpload({ uploadedByUserId: "u1", uploadedByAdminId: null }, anonymous)).toBe(false);
  });
});
