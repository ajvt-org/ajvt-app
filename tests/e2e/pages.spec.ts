import { test, expect, type Page, type Browser } from "@playwright/test";
import { Client } from "pg";
import { localDatabase } from "../localDatabase.mjs";
import { acceptPayment, freshName, freshPhone, openAdmin, submitMembership } from "./helpers";

const PAGES = [
  "/",
  "/activities",
  "/ages",
  "/matches",
  "/donate",
  "/quiz",
  "/leaderboard",
  "/login",
  "/register",
  "/forgot-password",
  "/change-password",
  "/form",
  "/membership",
  "/home",
  "/profile",
];

const ERROR_BOUNDARY = "حدث خطأ غير متوقع";

async function sweep(page: Page, label: string) {
  const failures: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 500) failures.push(`${r.status()} ${r.url()}`);
  });
  page.on("pageerror", (e) => failures.push(`js: ${String(e).slice(0, 120)}`));

  for (const path of PAGES) {
    await page.goto(path, { waitUntil: "networkidle" });

    const state = await page.evaluate(
      (marker) => ({
        shell: !!document.querySelector(".app-shell"),
        broke: document.body.innerText.includes(marker),
        overflows: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }),
      ERROR_BOUNDARY,
    );

    if (state.broke) failures.push(`${path} fell into the error boundary`);
    else if (!state.shell) failures.push(`${path} did not render`);
    if (state.overflows) failures.push(`${path} scrolls sideways`);
  }

  expect(failures, `${label}: ${failures.join(" | ")}`).toEqual([]);
}

async function createAccountOnly(page: Page, phone: string, fullName: string) {
  await page.goto("/register");
  await page.fill('input[type="tel"]', phone);
  await page.fill('input[type="password"] >> nth=0', "test1234");
  await page.fill('input[type="password"] >> nth=1', "test1234");
  await page.getByRole("button", { name: "التالي" }).click();
  await page.fill('input[name="fullName"]', fullName);
  await page.selectOption("#signup-age", "البدريين");
  await page.getByRole("button", { name: "إنشاء الحساب" }).click();
  await page.waitForURL("**/home");
}

async function createMember(page: Page, phone: string, fullName: string) {
  await createAccountOnly(page, phone, fullName);
  await page.goto("/membership");
  await submitMembership(page, "بنكيلي");
  await page.waitForTimeout(2000);
}

test.use({ viewport: { width: 390, height: 844 } });

test("every page renders for a visitor", async ({ page }) => {
  await sweep(page, "visitor");
});

test("every page renders for an account with no membership request", async ({ page }) => {
  await createAccountOnly(page, freshPhone(), freshName("حساب بلا طلب"));
  await sweep(page, "account with no member");
});

test("every page renders for a member", async ({ page }) => {
  await createMember(page, freshPhone(), freshName("حساب بلا طلب"));
  await sweep(page, "member");
});

async function withDb<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({
    connectionString: process.env.E2E_DATABASE_URL ?? localDatabase("ajvt_e2e"),
  });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

async function approve(browser: Browser, fullName: string) {
  const { context, page: admin } = await openAdmin(browser);
  await acceptPayment(admin, fullName);
  await expect(admin.getByText(fullName).first()).toBeVisible();
  await context.close();
}

test("every page renders for an approved member", async ({ page, browser }) => {
  const fullName = freshName("عضو مقبول");
  await createMember(page, freshPhone(), fullName);
  await approve(browser, fullName);
  await sweep(page, "approved member");
});

test("every page renders for a member a year behind", async ({ page }) => {
  const phone = freshPhone();
  await createMember(page, phone, freshName("عضو متأخر"));
  await withDb((client) =>
    client.query(
      `UPDATE "Membership" SET year = year - 1
       WHERE "userId" = (SELECT id FROM "User" WHERE phone = $1)`,
      [phone],
    ),
  );
  await sweep(page, "member a year behind");
});
