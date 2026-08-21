import { describe, it, expect } from "vitest";
import { releaseFrom } from "./release";

describe("releaseFrom", () => {
  it("reads the version off a release merge", () => {
    expect(releaseFrom("Release 0.42.6 (#556)")).toBe("0.42.6");
    expect(releaseFrom("Release 1.0.0")).toBe("1.0.0");
  });

  it("ignores a subject that only resembles a release", () => {
    expect(releaseFrom("Release 0.42 (#5)", "abc1234def")).toBe("abc1234");
    expect(releaseFrom("Prepare Release 0.42.6", "abc1234def")).toBe("abc1234");
  });

  it("falls back to the short commit, then to dev", () => {
    expect(releaseFrom("Fix the banner", "abc1234def")).toBe("abc1234");
    expect(releaseFrom(null, "abc1234def")).toBe("abc1234");
    expect(releaseFrom(null)).toBe("dev");
    expect(releaseFrom("Fix the banner")).toBe("dev");
  });
});
