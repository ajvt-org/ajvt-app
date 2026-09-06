import { describe, it, expect } from "vitest";
import { MONEY_AREAS } from "@/lib/adminNav";
import { adminTabs } from "@/lib/texts";
import { NAV_TABS, subtabsFor, tabActiveFor, tabsFor } from "./navTabs";

const SHARED = [
  MONEY_AREAS.payments,
  MONEY_AREAS.receipts,
  MONEY_AREAS.supporters,
  MONEY_AREAS.expenses,
];

const MONEY = [...SHARED, MONEY_AREAS.treasury, MONEY_AREAS.report];

function labels(role: string | null): string[] {
  return tabsFor(role).map((tab) => tab.label);
}

function subtabHrefs(role: string | null, pathname: string): string[] {
  return subtabsFor(role, pathname).map((tab) => tab.href);
}

describe("the admin navigation", () => {
  it("carries seven destinations", () => {
    expect(NAV_TABS).toHaveLength(7);
  });

  it("holds every money screen under the one tab", () => {
    const money = NAV_TABS.find((tab) => tab.label === adminTabs.money);
    expect(money?.tabs?.map((tab) => tab.href)).toEqual(MONEY);
  });

  it("shows a full access admin every money screen", () => {
    expect(subtabHrefs("SUPER", MONEY_AREAS.payments)).toEqual(MONEY);
    expect(subtabHrefs("OWNER", MONEY_AREAS.treasury)).toEqual(MONEY);
  });

  it("shows a members admin the money tab without the treasury or the report", () => {
    expect(labels("MEMBERS")).toContain(adminTabs.money);
    expect(subtabHrefs("MEMBERS", MONEY_AREAS.payments)).toEqual(SHARED);
  });

  it("shows an activities admin the same money screens", () => {
    expect(subtabHrefs("ACTIVITIES", MONEY_AREAS.receipts)).toEqual(SHARED);
  });

  it("puts the supporters board beside the payments and the receipts", () => {
    const money = NAV_TABS.find((tab) => tab.label === adminTabs.money);
    const hrefs = money?.tabs?.map((tab) => tab.href) ?? [];

    expect(hrefs.indexOf(MONEY_AREAS.supporters)).toBe(hrefs.indexOf(MONEY_AREAS.receipts) + 1);
  });

  it("gives every money screen an icon of its own, so the label is not the only difference", () => {
    const money = NAV_TABS.find((tab) => tab.label === adminTabs.money);
    const icons = money?.tabs?.map((tab) => tab.icon) ?? [];

    expect(icons).toHaveLength(MONEY.length);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it("hides the money tab from a role granted none of it", () => {
    expect(labels("QUIZ")).not.toContain(adminTabs.money);
    expect(labels("ACTIVITY")).not.toContain(adminTabs.money);
    expect(subtabHrefs("QUIZ", MONEY_AREAS.payments)).toEqual([]);
  });

  it("opens the money tab on the first screen the role is granted", () => {
    const forMembers = tabsFor("MEMBERS").find((tab) => tab.label === adminTabs.money);
    expect(forMembers?.href).toBe(MONEY_AREAS.payments);
  });

  it("keeps the rest of the navigation where it was", () => {
    expect(labels("QUIZ")).toEqual([adminTabs.quiz, adminTabs.tools]);
    expect(labels("MEMBERS")).toEqual([adminTabs.members, adminTabs.money, adminTabs.tools]);
  });

  it("marks the money tab as the current one on any of its screens", () => {
    const money = NAV_TABS.find((tab) => tab.label === adminTabs.money)!;
    for (const href of MONEY) {
      expect(tabActiveFor(money, href), href).toBe(true);
    }
    expect(tabActiveFor(money, "/admin/dashboard")).toBe(false);
  });

  it("shows no subtabs outside the money screens", () => {
    expect(subtabHrefs("SUPER", "/admin/dashboard")).toEqual([]);
    expect(subtabHrefs("SUPER", "/admin/tools")).toEqual([]);
  });
});

describe("the money paths arrive at the money tab", () => {
  const MONEY_TAB = NAV_TABS.find((tab) => tab.label === adminTabs.money)!;

  it("lights the money tab on every screen it holds", () => {
    for (const href of MONEY) {
      expect(tabActiveFor(MONEY_TAB, href), href).toBe(true);
    }
  });

  it("lights it on the screen the dashboard links to", () => {
    expect(tabActiveFor(MONEY_TAB, MONEY_AREAS.expenses)).toBe(true);
  });

  it("keeps the list filters on the money screens working", () => {
    expect(tabActiveFor(MONEY_TAB, MONEY_AREAS.payments)).toBe(true);
    expect(tabActiveFor(MONEY_TAB, `${MONEY_AREAS.payments}/anything`)).toBe(true);
  });

  it("leaves the other tabs alone", () => {
    for (const tab of NAV_TABS.filter((one) => one.label !== adminTabs.money)) {
      for (const href of MONEY) {
        expect(tabActiveFor(tab, href), `${tab.label} ${href}`).toBe(false);
      }
    }
  });

  it("offers a members admin every money screen it is granted", () => {
    expect(subtabHrefs("MEMBERS", MONEY_AREAS.expenses)).toEqual(SHARED);
  });
});
