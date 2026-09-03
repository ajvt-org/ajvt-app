import { randomInt } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { localDatabase } from "../localDatabase.mjs";
import { openAdmin } from "./helpers";

const PHONE = { width: 360, height: 740 };

const SUBTABS = 1;

const OVERFLOWS_A_PAGE = 25;

// The board these tests fill is the one every other spec reads, so the giving
// carries a marker and is taken back off the board when the file is done.
const MARKER = `داعم اختبار ${randomInt(100_000)}`;

function donor(label: string): string {
  return `${MARKER} ${label}`;
}

test.afterAll(async () => {
  const client = new Client({
    connectionString: process.env.E2E_DATABASE_URL ?? localDatabase("ajvt_e2e"),
  });
  await client.connect();
  for (const table of ["Payment", "Donation"]) {
    await client.query(`DELETE FROM "${table}" WHERE "donorName" LIKE $1`, [`${MARKER}%`]);
  }
  await client.end();
});

async function linesWithin(page: Page, strip: number): Promise<number> {
  const centres = await page
    .locator(".tab-strip")
    .nth(strip)
    .locator("button")
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return Math.round(box.top + box.height / 2);
      }),
    );
  return new Set(centres).size;
}

async function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
}

async function give(page: Page, donorName: string, amount: number) {
  const status = await page.evaluate(
    async (gift) => {
      const res = await fetch("/api/admin/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...gift, userId: null }),
      });
      return res.status;
    },
    { donorName, amount },
  );
  expect(status).toBe(201);
}

test("the supporters board fits a phone", async ({ browser }) => {
  const { context, page } = await openAdmin(browser);
  await page.setViewportSize(PHONE);

  const top = donor("الأول");
  await give(page, top, 750000);
  await give(page, donor("الثاني"), 4500);

  await page.goto("/admin/supporters");
  await expect(page.getByText(top)).toBeVisible();

  expect(await linesWithin(page, SUBTABS)).toBe(1);
  expect(await scrollsSideways(page)).toBe(false);

  await context.close();
});

test("the board loads its next page from the admin route", async ({ browser }) => {
  const { context, page } = await openAdmin(browser);
  await page.setViewportSize(PHONE);

  for (let i = 0; i < OVERFLOWS_A_PAGE; i++) {
    await give(page, donor(String(i)), 100000 - i * 100);
  }

  await page.goto("/admin/supporters");
  await page.waitForSelector("tbody tr");
  const firstPage = await page.locator("tbody tr").count();

  expect(firstPage).toBeLessThan(OVERFLOWS_A_PAGE);

  await page.getByRole("button", { name: "عرض المزيد" }).click();

  await expect.poll(() => page.locator("tbody tr").count()).toBeGreaterThan(firstPage);
  await expect(page.getByText("تعذّر تحميل المزيد، حاول مرة أخرى")).toBeHidden();

  await context.close();
});

test("the money subtabs stay on one line on every screen they hold", async ({ browser }) => {
  const { context, page } = await openAdmin(browser);
  await page.setViewportSize(PHONE);

  for (const path of ["/admin/payments", "/admin/receipts", "/admin/supporters"]) {
    await page.goto(path);
    await page.waitForSelector(".tab-strip");

    expect(await linesWithin(page, SUBTABS), path).toBe(1);
  }

  await context.close();
});
