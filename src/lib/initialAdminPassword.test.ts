import { describe, it, expect } from "vitest";
import {
  initialAdminPassword,
  MissingAdminPasswordError,
  LOCAL_DEFAULT_PASSWORD,
} from "@/lib/initialAdminPassword";

describe("initialAdminPassword", () => {
  it("takes the supplied password whatever the environment", () => {
    expect(initialAdminPassword({ ADMIN_INITIAL_PASSWORD: "s3cret", NODE_ENV: "production" })).toBe(
      "s3cret",
    );
    expect(initialAdminPassword({ ADMIN_INITIAL_PASSWORD: "s3cret" })).toBe("s3cret");
  });

  it("refuses to invent one in production", () => {
    expect(() => initialAdminPassword({ NODE_ENV: "production" })).toThrow(
      MissingAdminPasswordError,
    );
  });

  it("treats blank as unset", () => {
    expect(() =>
      initialAdminPassword({ ADMIN_INITIAL_PASSWORD: "   ", NODE_ENV: "production" }),
    ).toThrow(MissingAdminPasswordError);
  });

  it("falls back locally, where the fixed value is the point", () => {
    expect(initialAdminPassword({ NODE_ENV: "development" })).toBe(LOCAL_DEFAULT_PASSWORD);
    expect(initialAdminPassword({})).toBe(LOCAL_DEFAULT_PASSWORD);
  });
});
