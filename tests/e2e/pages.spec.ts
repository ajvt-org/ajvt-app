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

const GATEWAY = [502, 503, 504];

type Served = { status: number; url: string } | { error: string };

async function servedDocument(page: Page, path: string): Promise<Served> {
  try {
    const response = await page.goto(path, { waitUntil: "networkidle" });
    if (!response) return { error: "no document response" };
    return { status: response.status(), url: response.url() };
  } catch (e) {
    return { error: String(e).split("\n")[0].slice(0, 120) };
  }
}

async function sweep(page: Page, label: string) {
  const pageFaults: string[] = [];
  const runFaults: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 500 && r.request().resourceType() !== "document") {
      pageFaults.push(`${r.status()} ${r.url()}`);
    }
  });
  page.on("pageerror", (e) => pageFaults.push(`js: ${String(e).slice(0, 120)}`));

  for (const path of PAGES) {
    const served = await servedDocument(page, path);
    if ("error" in served) {
      runFaults.push(`${path} was not served (${served.error})`);
      continue;
    }
    if (GATEWAY.includes(served.status)) {
      runFaults.push(`${path} was not served (${served.status} from ${served.url})`);
      continue;
    }

    const state = await page.evaluate(
      (marker) => ({
        shell: !!document.querySelector(".app-shell"),
        broke: document.body.innerText.includes(marker),
        overflows: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }),
      ERROR_BOUNDARY,
    );

    if (state.broke) pageFaults.push(`${path} fell into the error boundary`);
    else if (!state.shell) pageFaults.push(`${path} answered ${served.status} and drew no shell`);
    if (state.overflows) pageFaults.push(`${path} scrolls sideways`);
  }

  expect(runFaults, `${label}: the server went away, ${runFaults.join(" | ")}`).toEqual([]);
  expect(pageFaults, `${label}: ${pageFaults.join(" | ")}`).toEqual([]);
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
