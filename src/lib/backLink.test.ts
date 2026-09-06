import { describe, it, expect } from "vitest";
import { safeNextPath } from "./utils";
import { parentFrom, withFrom } from "./backLink";

describe("withFrom", () => {
  it("names the origin on the target", () => {
    expect(withFrom("/membership", "/profile")).toBe("/membership?from=%2Fprofile");
  });

  it("keeps a query the target already carries", () => {
    expect(withFrom("/quiz?competition=c1", "/home")).toBe("/quiz?competition=c1&from=%2Fhome");
  });

  it("keeps the query of the origin", () => {
    expect(withFrom("/membership", "/quiz?competition=c1")).toBe(
      "/membership?from=%2Fquiz%3Fcompetition%3Dc1",
    );
  });

  it("does not nest one origin inside another", () => {
    expect(withFrom("/membership", "/quiz?from=%2Fhome")).toBe("/membership?from=%2Fquiz");
  });

  it("leaves the target alone when there is no origin to name", () => {
    expect(withFrom("/membership", "")).toBe("/membership");
  });

  it("round trips through the reader of the parameter", () => {
    const origin = "/quiz?competition=c1";
    const href = withFrom("/membership", origin);
    const from = new URLSearchParams(href.slice(href.indexOf("?") + 1)).get("from");

    expect(safeNextPath(from, "/home")).toBe(origin);
  });
});

describe("parentFrom", () => {
  it("takes the parent the arriving link names", () => {
    expect(parentFrom("/home", "/activities", true)).toBe("/home");
  });

  it("falls back when the link names nothing", () => {
    expect(parentFrom(null, "/activities", true)).toBe("/activities");
    expect(parentFrom("", "/activities", false)).toBe("/activities");
  });

  it("does not let a reader without a session inherit one that needs a session", () => {
    expect(parentFrom("/home", "/activities", false)).toBe("/activities");
    expect(parentFrom("/profile", "/activities", false)).toBe("/activities");
    expect(parentFrom("/membership", "/activities", false)).toBe("/activities");
  });

  it("keeps a parent a reader without a session can actually reach", () => {
    expect(parentFrom("/activities", "/", false)).toBe("/activities");
    expect(parentFrom("/leaderboard", "/", false)).toBe("/leaderboard");
  });

  it("still refuses a path that points off this site", () => {
    expect(parentFrom("//evil.example", "/activities", true)).toBe("/activities");
    expect(parentFrom("https://evil.example", "/activities", true)).toBe("/activities");
  });
});
