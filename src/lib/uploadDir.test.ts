import { describe, it, expect, afterEach } from "vitest";
import { join } from "path";
import {
  UploadDirInsidePublicError,
  assertUploadDirOutsidePublic,
  getUploadDir,
  isServedAsStatic,
  uploadDirFrom,
} from "./uploadDir";

const original = process.env.UPLOAD_DIR;
const LOCAL = "postgresql://ajvt:ajvt@localhost:5433/ajvt";
const REMOTE = "postgresql://ajvt:secret@db.example.net:5432/ajvt";

afterEach(() => {
  if (original === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = original;
});

describe("where uploads live", () => {
  it("uses the mounted disk when the platform names one", () => {
    process.env.UPLOAD_DIR = "/var/data/uploads";

    expect(getUploadDir()).toBe("/var/data/uploads");
  });

  it("falls back to the public folder in development", () => {
    delete process.env.UPLOAD_DIR;

    expect(getUploadDir()).toBe(join(process.cwd(), "public", "uploads"));
  });

  it("reads a name that is only spaces as no name at all", () => {
    expect(uploadDirFrom({ UPLOAD_DIR: "   " })).toBe(join(process.cwd(), "public", "uploads"));
  });
});

describe("isServedAsStatic", () => {
  it("holds for the public folder and anything under it", () => {
    expect(isServedAsStatic(join(process.cwd(), "public"))).toBe(true);
    expect(isServedAsStatic(join(process.cwd(), "public", "uploads"))).toBe(true);
    expect(isServedAsStatic("public/uploads")).toBe(true);
    expect(isServedAsStatic("./public/uploads/../uploads")).toBe(true);
  });

  it("does not hold for a directory beside it", () => {
    expect(isServedAsStatic(join(process.cwd(), "uploads"))).toBe(false);
    expect(isServedAsStatic("/var/data/uploads")).toBe(false);
    expect(isServedAsStatic(join(process.cwd(), "public-uploads"))).toBe(false);
  });
});

describe("assertUploadDirOutsidePublic", () => {
  it("refuses the fallback when the database is not local", () => {
    expect(() => assertUploadDirOutsidePublic({ DATABASE_URL: REMOTE })).toThrow(
      UploadDirInsidePublicError,
    );
  });

  it("refuses a named directory inside the public folder just the same", () => {
    expect(() =>
      assertUploadDirOutsidePublic({ UPLOAD_DIR: "public/proofs", DATABASE_URL: REMOTE }),
    ).toThrow(UploadDirInsidePublicError);
  });

  it("leaves the fallback alone against a local database, since that is how we all run", () => {
    expect(() => assertUploadDirOutsidePublic({ DATABASE_URL: LOCAL })).not.toThrow();
  });

  it("accepts a directory outside the public folder against any database", () => {
    expect(() =>
      assertUploadDirOutsidePublic({ UPLOAD_DIR: "/var/data/uploads", DATABASE_URL: REMOTE }),
    ).not.toThrow();
  });

  it("refuses the fallback when there is no database url to read", () => {
    expect(() => assertUploadDirOutsidePublic({})).toThrow(UploadDirInsidePublicError);
  });
});
