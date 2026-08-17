import { describe, it, expect } from "vitest";
import { allowedAreas, canOpen, landingFor } from "@/lib/adminNav";

describe("allowedAreas", () => {
  it("gives a full admin everything", () => {
    expect(allowedAreas("SUPER")).toBeNull();
  });

  it("gives a scoped activity admin only the activities area", () => {
    expect(allowedAreas("ACTIVITY")).toEqual(["/admin/activities"]);
  });

  it("gives a role it has never heard of nothing at all", () => {
    expect(allowedAreas("SOMETHING_NEW")).toEqual([]);
    expect(allowedAreas("")).toEqual([]);
  });

  it("treats a session with no role yet as unrestricted, since it is still loading", () => {
    expect(allowedAreas(null)).toBeNull();
  });
});

describe("canOpen", () => {
  it("lets a members admin into its own areas and not others", () => {
    expect(canOpen("MEMBERS", "/admin/dashboard")).toBe(true);
    expect(canOpen("MEMBERS", "/admin/payments")).toBe(true);
    expect(canOpen("MEMBERS", "/admin/activities")).toBe(false);
    expect(canOpen("MEMBERS", "/admin/quiz")).toBe(false);
  });

  it("keeps a scoped activity admin out of members, finance and the quiz", () => {
    expect(canOpen("ACTIVITY", "/admin/activities")).toBe(true);
    expect(canOpen("ACTIVITY", "/admin/activities/abc")).toBe(true);
    expect(canOpen("ACTIVITY", "/admin/dashboard")).toBe(false);
    expect(canOpen("ACTIVITY", "/admin/expenses")).toBe(false);
    expect(canOpen("ACTIVITY", "/admin/payments")).toBe(false);
    expect(canOpen("ACTIVITY", "/admin/quiz")).toBe(false);
  });

  it("refuses every page for an unknown role rather than waving it through", () => {
    expect(canOpen("SOMETHING_NEW", "/admin/dashboard")).toBe(false);
    expect(canOpen("SOMETHING_NEW", "/admin/activities")).toBe(false);
  });

  it("lets a full admin anywhere", () => {
    expect(canOpen("SUPER", "/admin/quiz")).toBe(true);
    expect(canOpen("SUPER", "/admin/settings")).toBe(true);
  });
});

describe("landingFor", () => {
  it("sends a restricted admin to its first area", () => {
    expect(landingFor("ACTIVITY")).toBe("/admin/activities");
    expect(landingFor("MEMBERS")).toBe("/admin/dashboard");
  });

  it("has nowhere in particular to send a full admin", () => {
    expect(landingFor("SUPER")).toBeNull();
  });

  it("has nowhere to send an unknown role, which leaves it stuck rather than loose", () => {
    expect(landingFor("SOMETHING_NEW")).toBeNull();
  });
});
