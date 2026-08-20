import { describe, it, expect } from "vitest";
import { planFor, thumbNameOf, webpNameOf } from "./legacyImages";

describe("webpNameOf", () => {
  it("swaps the extension for webp", () => {
    expect(webpNameOf("abc.png")).toBe("abc.webp");
    expect(webpNameOf("abc.jpeg")).toBe("abc.webp");
    expect(webpNameOf("abc.webp")).toBe("abc.webp");
  });

  it("appends webp when there is no extension", () => {
    expect(webpNameOf("abc")).toBe("abc.webp");
  });
});

describe("thumbNameOf", () => {
  it("matches the toThumbUrl convention", () => {
    expect(thumbNameOf("abc.webp")).toBe("abc-thumb.webp");
    expect(thumbNameOf("abc.png")).toBe("abc-thumb.webp");
  });
});

describe("planFor", () => {
  it("re-encodes a non-webp original", () => {
    expect(planFor("abc.png", new Set())).toEqual({
      kind: "reencode",
      filename: "abc.png",
      webp: "abc.webp",
      thumb: "abc-thumb.webp",
    });
  });

  it("re-encodes even when a webp from an interrupted run exists", () => {
    expect(planFor("abc.jpg", new Set(["abc.webp", "abc-thumb.webp"]))?.kind).toBe("reencode");
  });

  it("adds the missing thumbnail for a raw webp", () => {
    expect(planFor("abc.webp", new Set(["abc.webp"]))).toEqual({
      kind: "thumbnail",
      filename: "abc.webp",
      thumb: "abc-thumb.webp",
    });
  });

  it("leaves a webp with its thumbnail alone", () => {
    expect(planFor("abc.webp", new Set(["abc.webp", "abc-thumb.webp"]))).toBeNull();
  });
});
