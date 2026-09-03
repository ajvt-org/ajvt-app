import { describe, it, expect } from "vitest";
import { adminBackLink, memberCardHref } from "./adminBackLink";

describe("adminBackLink", () => {
  it("returns to the activity tab it was opened from", () => {
    const back = adminBackLink("/admin/activities/a1?tab=teams");
    expect(back.href).toBe("/admin/activities/a1?tab=teams");
    expect(back.label).toBe("النشاط");
  });

  it("keeps the members list wording when it came from there", () => {
    const back = adminBackLink("/admin/dashboard");
    expect(back.href).toBe("/admin/dashboard");
    expect(back.label).toBe("المستخدمون");
  });

  it("keeps the filters the members list was carrying", () => {
    expect(adminBackLink("/admin/dashboard?tab=pending&q=ali").href).toBe(
      "/admin/dashboard?tab=pending&q=ali",
    );
  });

  it("names the activities index and the admin home", () => {
    expect(adminBackLink("/admin/activities").label).toBe("الأنشطة");
    expect(adminBackLink("/admin").label).toBe("لوحة التحكم");
  });

  it("falls back to the members list when it was opened from nowhere", () => {
    for (const from of [null, undefined, ""]) {
      const back = adminBackLink(from);
      expect(back.href).toBe("/admin/dashboard");
      expect(back.label).toBe("المستخدمون");
    }
  });

  it("falls back rather than navigating to a rubbish target", () => {
    for (const from of ["https://evil.example", "//evil.example", "javascript:alert(1)"]) {
      expect(adminBackLink(from).href).toBe("/admin/dashboard");
    }
  });

  it("says only that it goes back when the origin is a screen it has no wording for", () => {
    expect(adminBackLink("/admin/payments").label).toBe("رجوع");
    expect(adminBackLink("/admin/members/m1").label).toBe("رجوع");
  });
});

describe("memberCardHref", () => {
  it("carries the origin so the card knows where to return", () => {
    expect(memberCardHref("m1", "/admin/activities/a1?tab=teams")).toBe(
      "/admin/members/m1?from=%2Fadmin%2Factivities%2Fa1%3Ftab%3Dteams",
    );
  });

  it("round trips through adminBackLink", () => {
    const origin = "/admin/dashboard?tab=pending&q=ali";
    const href = memberCardHref("m1", origin);
    const from = new URLSearchParams(href.slice(href.indexOf("?"))).get("from");
    expect(adminBackLink(from).href).toBe(origin);
  });

  it("leaves the plain card path alone when there is no origin", () => {
    expect(memberCardHref("m1", "")).toBe("/admin/members/m1");
  });

  it("does not nest one card origin inside the next", () => {
    const first = memberCardHref("m1", "/admin/activities/a1?tab=teams");
    const second = memberCardHref(
      "m2",
      `/admin/members/m1?from=${encodeURIComponent("/admin/activities/a1?tab=teams")}`,
    );
    expect(first.length).toBeGreaterThan(0);
    expect(second).toBe("/admin/members/m2?from=%2Fadmin%2Fmembers%2Fm1");
  });

  it("keeps the other query the origin was carrying", () => {
    expect(memberCardHref("m2", "/admin/dashboard?tab=pending&from=%2Fadmin&q=ali")).toBe(
      "/admin/members/m2?from=%2Fadmin%2Fdashboard%3Ftab%3Dpending%26q%3Dali",
    );
  });
});
