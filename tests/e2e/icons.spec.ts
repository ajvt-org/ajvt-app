import { test, expect, type Page } from "@playwright/test";
import { freshName, freshPhone, openAdmin, signUp } from "./helpers";
import { ICON_MARKUP, iconFaults } from "./iconFaults";

const PHONE = { width: 360, height: 780 };

const VISITOR = [
  "/",
  "/activities",
  "/matches",
  "/ages",
  "/leaderboard",
  "/donate",
  "/login",
  "/register",
];

const MEMBER = ["/home", "/profile", "/membership", "/activities", "/leaderboard"];

const ADMIN = [
  "/admin",
  "/admin/dashboard",
  "/admin/activities",
  "/admin/payments",
  "/admin/supporters",
  "/admin/receipts",
  "/admin/expenses",
  "/admin/stats",
  "/admin/settings",
  "/admin/tools",
];

async function sweep(page: Page, paths: string[], who: string): Promise<string[]> {
  const faults: string[] = [];
  for (const path of paths) {
    await page.goto(path, { waitUntil: "networkidle" });
    faults.push(...(await iconFaults(page, `${who} ${path}`)));
  }
  return faults;
}

test("every icon a visitor meets is drawn at its size and can be seen", async ({ page }) => {
  await page.setViewportSize(PHONE);
  const faults = await sweep(page, VISITOR, "visitor");
  expect(faults, faults.join("\n")).toEqual([]);
});

test("every icon a member meets is drawn at its size and can be seen", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await signUp(page, {
    phone: freshPhone(),
    password: "test1234",
    fullName: freshName("عضو الأيقونات"),
    age: "البدريين",
  });
  const faults = await sweep(page, MEMBER, "member");
  expect(faults, faults.join("\n")).toEqual([]);
});

test("every icon an admin meets is drawn at its size and can be seen", async ({ browser }) => {
  const { context, page } = await openAdmin(browser);
  await page.setViewportSize(PHONE);
  const faults = await sweep(page, ADMIN, "admin");
  await context.close();
  expect(faults, faults.join("\n")).toEqual([]);
});

test("the check passes an icon on a dark gradient and flags a faint or crushed one", async ({
  page,
}) => {
  await page.setViewportSize(PHONE);
  await page.setContent(`
    <body style="margin:0;background:#fff;font:16px sans-serif">
      <div style="padding:16px;background:linear-gradient(135deg,#265c49,#357a62)">
        <span style="color:#fff">${ICON_MARKUP(24)} on the header</span>
      </div>
      <div style="padding:16px;background:linear-gradient(90deg,#f0faf5,#ffffff)">
        <span style="color:#a0d4c0">${ICON_MARKUP(24)} faint on a pale wash</span>
      </div>
      <p style="padding:16px;color:#70b89c">${ICON_MARKUP(40)} faint on white</p>
      <div style="display:flex;width:120px;padding:16px">
        <span style="display:flex;min-width:0;color:#265c49">${ICON_MARKUP(20, "min-width:0")}</span>
        <span style="flex:0 0 118px">crushed beside a long label</span>
      </div>
    </body>`);

  const faults = await iconFaults(page, "fixture");

  expect(faults.some((fault) => fault.includes("on the header"))).toBe(false);
  expect(faults.filter((fault) => fault.includes("faint on a pale wash"))).toHaveLength(1);
  expect(faults.filter((fault) => fault.includes("faint on white"))).toHaveLength(1);
  expect(faults.filter((fault) => fault.includes("drawn at"))).toHaveLength(1);
});
