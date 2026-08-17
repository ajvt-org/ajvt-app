import { describe, it, expect } from "vitest";
import { backFromNext, needsSession } from "./authPaths";

describe("needsSession", () => {
  it("holds for the pages the proxy guards", () => {
    expect(needsSession("/home")).toBe(true);
    expect(needsSession("/profile")).toBe(true);
    expect(needsSession("/change-password")).toBe(true);
    expect(needsSession("/admin/dashboard")).toBe(true);
  });

  it("holds for an edit of an existing submission but not a new one", () => {
    expect(needsSession("/form?id=abc")).toBe(true);
    expect(needsSession("/form")).toBe(false);
  });

  it("does not hold for pages a visitor can open", () => {
    expect(needsSession("/")).toBe(false);
    expect(needsSession("/activities/abc")).toBe(false);
    expect(needsSession("/ages")).toBe(false);
    expect(needsSession("/donate")).toBe(false);
  });
});

describe("backFromNext", () => {
  it("sends back to the fallback when next is where the proxy just came from", () => {
    expect(backFromNext("/home", "/")).toBe("/");
    expect(backFromNext("/profile", "/")).toBe("/");
    expect(backFromNext("/form?id=abc", "/")).toBe("/");
  });

  it("keeps next when a visitor can open it", () => {
    expect(backFromNext("/activities/abc", "/")).toBe("/activities/abc");
    expect(backFromNext("/form", "/")).toBe("/form");
  });

  it("refuses anything that is not an in-app path", () => {
    expect(backFromNext(null, "/")).toBe("/");
    expect(backFromNext("", "/")).toBe("/");
    expect(backFromNext("//evil.example", "/")).toBe("/");
    expect(backFromNext("https://evil.example", "/")).toBe("/");
  });
});
