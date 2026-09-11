import { describe, it, expect } from "vitest";
import { TOOL_HREFS, TOOL_LINKS, toolAt, toolsFor } from "./toolLinks";
import { canOpen, MONEY_AREAS } from "./adminNav";

describe("toolAt", () => {
  it("gives a page the same name and icon the row that opens it carries", () => {
    for (const href of TOOL_HREFS) {
      expect(toolAt(href)).toEqual(TOOL_LINKS.find((tool) => tool.href === href));
    }
  });

  it("names the admin accounts tool once", () => {
    expect(toolAt("/admin/admins").label).toBe("حسابات المشرفين");
  });
});

describe("toolsFor", () => {
  it("offers the whole set to a full access role", () => {
    expect(toolsFor("SUPER").map((tool) => tool.href)).toEqual(TOOL_LINKS.map((tool) => tool.href));
  });

  it("holds the super only tools back from a lesser role", () => {
    expect(toolsFor("ADMIN").map((tool) => tool.href)).not.toContain("/admin/audit-log");
  });

  it("names every tool whatever the role, so a heading never goes missing", () => {
    const offered = toolsFor("ADMIN").map((tool) => tool.href);

    expect(offered).not.toContain("/admin/audit-log");
    for (const href of TOOL_HREFS) expect(toolAt(href).label).not.toBe("");
  });
});

describe("the proof checker sits behind the payments area", () => {
  const CHECKER = "/admin/payments/proof-check";

  it("lives under the area whose answer it wraps", () => {
    expect(CHECKER.startsWith(`${MONEY_AREAS.payments}/`)).toBe(true);
  });

  it("is offered to a role that can open the payments area", () => {
    expect(toolsFor("MEMBERS").map((tool) => tool.href)).toContain(CHECKER);
    expect(canOpen("MEMBERS", MONEY_AREAS.payments)).toBe(true);
  });

  it("is held back from a role that cannot", () => {
    expect(canOpen("QUIZ", MONEY_AREAS.payments)).toBe(false);
    expect(toolsFor("QUIZ").map((tool) => tool.href)).not.toContain(CHECKER);
  });
});
