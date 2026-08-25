import { describe, it, expect, afterEach } from "vitest";
import { join } from "path";
import { getUploadDir } from "./uploadDir";

const original = process.env.UPLOAD_DIR;

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
});
