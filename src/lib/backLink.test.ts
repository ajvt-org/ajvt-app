import { describe, it, expect } from "vitest";
import { safeNextPath } from "./utils";
import { withFrom } from "./backLink";

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
