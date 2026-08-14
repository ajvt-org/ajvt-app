import { describe, it, expect, afterEach, vi } from "vitest";
import {
  validatePhone,
  safeNextPath,
  toThumbUrl,
  loginPathWithNext,
  formatDateTime,
} from "./utils";

describe("validatePhone", () => {
  it("accepts 8 digits starting with 2, 3 or 4", () => {
    expect(validatePhone("22334455")).toBeNull();
    expect(validatePhone("31234567")).toBeNull();
    expect(validatePhone("41234567")).toBeNull();
  });

  it("ignores separators when counting digits", () => {
    expect(validatePhone("22 33 44 55")).toBeNull();
    expect(validatePhone("+222 22334455")).not.toBeNull();
  });

  it("rejects anything that is not exactly 8 digits", () => {
    expect(validatePhone("2233445")).not.toBeNull();
    expect(validatePhone("223344556")).not.toBeNull();
    expect(validatePhone("")).not.toBeNull();
  });

  it("rejects a first digit outside 2, 3 and 4", () => {
    for (const first of ["0", "1", "5", "6", "7", "8", "9"]) {
      expect(validatePhone(`${first}1234567`)).not.toBeNull();
    }
  });
});

describe("safeNextPath", () => {
  it("keeps a same-origin relative path", () => {
    expect(safeNextPath("/home", "/fallback")).toBe("/home");
    expect(safeNextPath("/form?id=abc", "/fallback")).toBe("/form?id=abc");
  });

  it("falls back when there is no target", () => {
    expect(safeNextPath(null, "/fallback")).toBe("/fallback");
    expect(safeNextPath(undefined, "/fallback")).toBe("/fallback");
    expect(safeNextPath("", "/fallback")).toBe("/fallback");
  });

  it("refuses absolute URLs so login cannot become an open redirect", () => {
    expect(safeNextPath("https://evil.example", "/fallback")).toBe("/fallback");
    expect(safeNextPath("http://evil.example", "/fallback")).toBe("/fallback");
    expect(safeNextPath("javascript:alert(1)", "/fallback")).toBe("/fallback");
  });

  it("refuses protocol-relative URLs, which browsers treat as absolute", () => {
    expect(safeNextPath("//evil.example", "/fallback")).toBe("/fallback");
    expect(safeNextPath("//evil.example/path", "/fallback")).toBe("/fallback");
  });
});

describe("toThumbUrl", () => {
  it("points a webp at its thumbnail", () => {
    expect(toThumbUrl("/api/files/photo.webp")).toBe("/api/files/photo-thumb.webp");
  });

  it("leaves pre-compression uploads alone, they have no thumbnail on disk", () => {
    expect(toThumbUrl("/api/files/photo.jpeg")).toBe("/api/files/photo.jpeg");
    expect(toThumbUrl("/api/files/photo.png")).toBe("/api/files/photo.png");
  });
});

describe("loginPathWithNext", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function atLocation(pathname: string, search = "") {
    vi.stubGlobal("window", { location: { pathname, search } });
  }

  it("returns the bare path on the server, where there is no window", () => {
    expect(loginPathWithNext("/login")).toBe("/login");
  });

  it("appends the current location", () => {
    atLocation("/form", "?id=abc");
    expect(loginPathWithNext("/login")).toBe(`/login?next=${encodeURIComponent("/form?id=abc")}`);
  });

  it("does not send the user back to the root or to the login page itself", () => {
    atLocation("/");
    expect(loginPathWithNext("/login")).toBe("/login");

    atLocation("/login");
    expect(loginPathWithNext("/login")).toBe("/login");

    atLocation("/admin/login");
    expect(loginPathWithNext("/admin/login")).toBe("/admin/login");
  });
});

describe("formatDateTime", () => {
  it("puts the parts in a fixed order", () => {
    expect(formatDateTime(new Date(2026, 7, 14, 15, 18))).toBe("2026/08/14 15:18");
  });

  it("pads single digits so rows line up", () => {
    expect(formatDateTime(new Date(2026, 0, 5, 9, 4))).toBe("2026/01/05 09:04");
  });

  it("emits no directional marks, which is what scrambled the log", () => {
    expect(formatDateTime(new Date(2026, 7, 14, 15, 18))).toMatch(/^[\d/: ]+$/);
  });
});
