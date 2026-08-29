import { describe, it, expect } from "vitest";
import { HOME_VILLAGE } from "./villages";
import { nameOf, personOf, withPerson } from "./person";

const ACCOUNT = {
  fullName: "محمد ولد أحمد",
  age: "البدريين",
  village: HOME_VILLAGE,
  photo: "photo.webp",
  photoLocked: false,
  memberNumber: "AJVT-2026-0001",
  verifyToken: "tok",
};

describe("personOf", () => {
  it("reads an account with no name as a blank one", () => {
    expect(personOf({ ...ACCOUNT, fullName: null }).fullName).toBe("");
  });

  it("leaves an age group that is genuinely absent absent", () => {
    expect(personOf({ ...ACCOUNT, age: null }).age).toBeNull();
  });

  it("carries the picture block, which belongs to the person like the picture", () => {
    expect(personOf({ ...ACCOUNT, photoLocked: true }).photoLocked).toBe(true);
  });
});

describe("withPerson", () => {
  it("puts the person alongside the membership", () => {
    const shaped = withPerson({ id: "m1", status: "ACTIVE", user: ACCOUNT });

    expect(shaped.id).toBe("m1");
    expect(shaped.status).toBe("ACTIVE");
    expect(shaped.fullName).toBe("محمد ولد أحمد");
    expect(shaped.village).toBe(HOME_VILLAGE);
    expect(shaped.photoLocked).toBe(false);
  });

  it("leaves the rest of the account where it was", () => {
    const shaped = withPerson({ id: "m1", user: { ...ACCOUNT, phone: "22334455" } });

    expect(shaped.user).toEqual({ phone: "22334455" });
  });

  it("never carries a password out of the account", () => {
    const shaped = withPerson({ id: "m1", user: { ...ACCOUNT, password: "hash" } });

    expect(shaped.user).toEqual({ password: "hash" });
    expect(shaped).not.toHaveProperty("password");
  });
});

describe("nameOf", () => {
  it("reads a missing name as a blank one", () => {
    expect(nameOf({ fullName: null })).toBe("");
    expect(nameOf({ fullName: "محمد" })).toBe("محمد");
  });
});
