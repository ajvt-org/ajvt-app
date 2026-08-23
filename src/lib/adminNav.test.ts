import { describe, it, expect } from "vitest";
import { allowedAreas, canOpen, landingFor, tabActive } from "@/lib/adminNav";

describe("allowedAreas", () => {
  it("gives a full admin everything", () => {
    expect(allowedAreas("SUPER")).toBeNull();
  });

  it("gives a scoped activity admin its activities and its own account", () => {
    expect(allowedAreas("ACTIVITY")).toEqual([
      "/admin/activities",
      "/admin/tools",
      "/admin/password",
    ]);
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

  it("lets every role change its own password from the tools tab", () => {
    for (const role of ["MEMBERS", "ACTIVITIES", "QUIZ", "ACTIVITY"]) {
      expect(canOpen(role, "/admin/tools"), role).toBe(true);
      expect(canOpen(role, "/admin/password"), role).toBe(true);
    }
  });

  it("keeps the tools that belong to a full admin out of every other role", () => {
    for (const role of ["MEMBERS", "ACTIVITIES", "QUIZ", "ACTIVITY"]) {
      expect(canOpen(role, "/admin/admins"), role).toBe(false);
      expect(canOpen(role, "/admin/audit-log"), role).toBe(false);
      expect(canOpen(role, "/admin/broadcast"), role).toBe(false);
    }
    expect(canOpen("SUPER", "/admin/admins")).toBe(true);
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

describe("tabActive", () => {
  it("matches the tab itself and its sub-pages", () => {
    expect(tabActive("/admin/activities", "/admin/activities")).toBe(true);
    expect(tabActive("/admin/activities", "/admin/activities/abc")).toBe(true);
    expect(tabActive("/admin/activities", "/admin/dashboard")).toBe(false);
  });

  it("keeps the accounts tab lit on a member detail page", () => {
    expect(tabActive("/admin/dashboard", "/admin/members/abc")).toBe(true);
  });

  it("keeps the activities tab lit on a tournament page", () => {
    expect(tabActive("/admin/activities", "/admin/tournament/abc")).toBe(true);
  });

  it("keeps the tools tab lit on its sub-pages", () => {
    for (const path of ["/admin/password", "/admin/admins", "/admin/audit-log", "/admin/broadcast"]) {
      expect(tabActive("/admin/tools", path), path).toBe(true);
    }
    expect(tabActive("/admin/tools", "/admin/dashboard")).toBe(false);
  });

  it("does not prefix-match across route names", () => {
    expect(tabActive("/admin/dashboard", "/admin/membership")).toBe(false);
  });

  it("is inactive with no pathname yet", () => {
    expect(tabActive("/admin/dashboard", null)).toBe(false);
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
