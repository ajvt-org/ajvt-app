import { describe, it, expect } from "vitest";
import {
  defaultPasswordVerdict,
  initialAdminPassword,
  isLocalDatabase,
  LOCAL_DEFAULT_PASSWORD,
  MissingAdminPasswordError,
  suppliedAdminPassword,
} from "@/lib/initialAdminPassword";

const LOCAL = "postgresql://ajvt:ajvt@localhost:5433/ajvt";
const REMOTE = "postgresql://ajvt:secret@dpg-abc123-a.frankfurt-postgres.render.com/ajvt";

describe("initialAdminPassword", () => {
  it("takes the supplied password whatever the database", () => {
    expect(initialAdminPassword({ ADMIN_INITIAL_PASSWORD: "s3cret", DATABASE_URL: REMOTE })).toBe(
      "s3cret",
    );
    expect(initialAdminPassword({ ADMIN_INITIAL_PASSWORD: "s3cret", DATABASE_URL: LOCAL })).toBe(
      "s3cret",
    );
  });

  it("refuses to invent one for a database that is not on this machine", () => {
    expect(() => initialAdminPassword({ DATABASE_URL: REMOTE })).toThrow(MissingAdminPasswordError);
  });

  it("refuses when nothing says which database this is", () => {
    expect(() => initialAdminPassword({})).toThrow(MissingAdminPasswordError);
  });

  it("treats blank as unset", () => {
    expect(() =>
      initialAdminPassword({ ADMIN_INITIAL_PASSWORD: "   ", DATABASE_URL: REMOTE }),
    ).toThrow(MissingAdminPasswordError);
  });

  it("falls back on a local database, where the fixed value is the point", () => {
    expect(initialAdminPassword({ DATABASE_URL: LOCAL })).toBe(LOCAL_DEFAULT_PASSWORD);
  });
});

describe("isLocalDatabase", () => {
  it("knows the hosts that only this machine answers on", () => {
    expect(isLocalDatabase(LOCAL)).toBe(true);
    expect(isLocalDatabase("postgresql://u:p@127.0.0.1:5432/db")).toBe(true);
    expect(isLocalDatabase("postgresql://u:p@host.docker.internal:5432/db")).toBe(true);
  });

  it("counts anything else as somewhere real", () => {
    expect(isLocalDatabase(REMOTE)).toBe(false);
    expect(isLocalDatabase("postgresql://u:p@10.0.0.4:5432/db")).toBe(false);
  });

  it("counts a url it cannot read as somewhere real", () => {
    expect(isLocalDatabase("not a url")).toBe(false);
    expect(isLocalDatabase(undefined)).toBe(false);
  });

  it("is not fooled by a host that merely mentions localhost", () => {
    expect(isLocalDatabase("postgresql://u:p@localhost.evil.com:5432/db")).toBe(false);
  });
});

describe("suppliedAdminPassword", () => {
  it("hands back the trimmed value", () => {
    expect(suppliedAdminPassword({ ADMIN_INITIAL_PASSWORD: "  s3cret  " })).toBe("s3cret");
  });

  it("has nothing for an unset or blank variable", () => {
    expect(suppliedAdminPassword({})).toBeNull();
    expect(suppliedAdminPassword({ ADMIN_INITIAL_PASSWORD: "   " })).toBeNull();
  });
});

describe("what to do with an account that still has the known password", () => {
  it("replaces it with the one that was supplied", () => {
    expect(defaultPasswordVerdict({ usesDefault: true, supplied: "s3cret" })).toEqual({
      action: "replace",
      password: "s3cret",
    });
  });

  it("warns when there is nothing to replace it with", () => {
    expect(defaultPasswordVerdict({ usesDefault: true, supplied: null })).toEqual({
      action: "warn",
    });
  });

  it("leaves a password the admin already changed alone", () => {
    expect(defaultPasswordVerdict({ usesDefault: false, supplied: "s3cret" })).toEqual({
      action: "keep",
    });
    expect(defaultPasswordVerdict({ usesDefault: false, supplied: null })).toEqual({
      action: "keep",
    });
  });
});
