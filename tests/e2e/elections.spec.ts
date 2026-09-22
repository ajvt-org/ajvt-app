import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { localDatabase } from "../localDatabase.mjs";
import {
  acceptPayment,
  freshName,
  freshPerson,
  openAdmin,
  signUp,
  submitMembership,
} from "./helpers";

const WALK_TIMEOUT = 180_000;
const PHONE = { width: 360, height: 740 };

const LONG_CANDIDATE = "محمد الأمين ولد أحمد ولد سيدي ولد الطالب";

const BASE_VOTER = {
  fullName: "سيدي ولد الناخب",
  password: "test1234",
  age: "البدريين",
  paymentMethod: "بنكيلي",
};

const BASE_OUTSIDER = {
  fullName: "زائر بلا انتساب",
  password: "test1234",
  age: "البدريين",
};

const FIRST = freshName("انتخاب رئيس اللجنة");
const SECOND = freshName("انتخاب أمين المال");
const THIRD = freshName("انتخاب الكاتب العام");

async function widerThanTheScreen(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const shell = document.documentElement;
    return shell.scrollWidth > shell.clientWidth;
  });
}

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

function localInput(at: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

function inFiveMinutes(): Date {
  const at = new Date();
  at.setMinutes(at.getMinutes() + 5, 0, 0);
  return at;
}

async function openIn(titles: string[], seconds: number) {
  await withDb(async (client) => {
    await client.query(
      `UPDATE "Election" SET "startsAt" = now() + ($2 || ' seconds')::interval
       WHERE "title" = ANY($1)`,
      [titles, seconds],
    );
  });
}

async function createElection(admin: Page, title: string, startsAt: Date, names: string[]) {
  await admin.getByRole("button", { name: "انتخاب جديد" }).click();
  await admin.fill("#e-title", title);
  await admin.fill("#e-start", localInput(startsAt));
  await admin.selectOption("#e-duration", "60");
  await admin.getByRole("switch", { name: "السماح بالورقة البيضاء" }).click();
  await admin.getByRole("button", { name: "حفظ" }).click();
  await expect(admin.getByRole("button", { name: "إضافة مترشح" })).toBeVisible();

  for (const name of names) {
    await admin.getByRole("button", { name: "إضافة مترشح" }).click();
    await admin.fill("#candidate-name", name);
    await admin.getByRole("button", { name: "حفظ", exact: true }).last().click();
    await expect(admin.getByRole("button", { name: `تعديل ${name}` })).toBeVisible();
  }
}

function adminRow(admin: Page, title: string) {
  return admin.locator("button").filter({ hasText: title }).first();
}

function memberRow(page: Page, title: string) {
  return page.locator("a").filter({ hasText: title }).first();
}

async function publish(admin: Page, title: string) {
  await adminRow(admin, title).click();
  await admin.getByRole("switch", { name: "إخفاء الانتخاب" }).click();
  await admin.getByRole("button", { name: "حفظ" }).first().click();
  await expect(adminRow(admin, title)).not.toContainText("مخفي");
}

async function closeAndPublish(title: string, showResults: boolean) {
  await withDb(async (client) => {
    await client.query(
      `UPDATE "Election"
         SET "startsAt" = now() - interval '2 hours', "showResults" = $2
       WHERE "title" = $1`,
      [title, showResults],
    );
  });
}

test("an admin opens two elections and a member votes in one of them", async ({
  page,
  browser,
}) => {
  test.setTimeout(WALK_TIMEOUT);
  await page.setViewportSize(PHONE);

  const voter = freshPerson(BASE_VOTER);
  await signUp(page, voter);
  await page.goto("/membership");
  await submitMembership(page, voter.paymentMethod);

  const { context: adminContext, page: admin } = await openAdmin(browser);
  await acceptPayment(admin, voter.fullName);

  const startsAt = inFiveMinutes();
  await admin.goto("/admin/elections");
  await createElection(admin, FIRST, startsAt, [LONG_CANDIDATE, "فاطمة بنت سيدي"]);
  await createElection(admin, SECOND, startsAt, ["أحمد ولد باب"]);

  await page.goto("/home");
  await expect(page.getByRole("link", { name: /افتح/ })).toHaveCount(0);

  await publish(admin, FIRST);
  await publish(admin, SECOND);

  await page.goto("/home");
  await page.getByRole("link", { name: /افتح/ }).click();
  await page.waitForURL("**/elections**");

  await expect(memberRow(page, FIRST)).toBeVisible();
  await expect(memberRow(page, SECOND)).toBeVisible();
  await expect(page.getByLabel("الوقت المتبقي لبداية التصويت").first()).toBeVisible();

  await memberRow(page, FIRST).click();
  await page.waitForURL("**/elections/**");
  await expect(page.getByText(LONG_CANDIDATE)).toBeVisible();
  await expect(page.getByRole("button", { name: "تأكيد التصويت" })).toHaveCount(0);

  await openIn([FIRST, SECOND], 10);
  await page.reload();
  await expect(page.getByLabel("الوقت المتبقي لبداية التصويت")).toBeVisible();

  await expect(page.getByLabel("الوقت المتبقي لانتهاء التصويت")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole("button", { name: "تأكيد التصويت" })).toBeVisible();

  expect(await widerThanTheScreen(page)).toBe(false);

  await page.getByRole("button", { name: LONG_CANDIDATE }).click();
  await page.getByRole("button", { name: "تأكيد التصويت" }).click();
  await expect(page.getByText("لا يمكن تغيير صوتك بعد تأكيده")).toBeVisible();
  expect(await widerThanTheScreen(page)).toBe(false);
  await page.getByRole("button", { name: "تأكيد التصويت" }).last().click();

  await expect(page.getByText("صوتك مسجّل")).toBeVisible();

  await page.reload();
  await expect(page.getByText("صوتك مسجّل")).toBeVisible();
  await expect(page.getByRole("button", { name: "تأكيد التصويت" })).toHaveCount(0);

  await page.goto("/elections");
  await expect(memberRow(page, FIRST)).toContainText("صوّتّ");
  await expect(memberRow(page, SECOND)).not.toContainText("صوّتّ");

  await memberRow(page, SECOND).click();
  await page.waitForURL("**/elections/**");
  await expect(page.getByRole("button", { name: "تأكيد التصويت" })).toBeVisible();

  await adminContext.close();
});

test("a reader who is not a member sees the notice rather than a button that refuses", async ({
  page,
  browser,
}) => {
  test.setTimeout(WALK_TIMEOUT);
  await page.setViewportSize(PHONE);

  const outsider = freshPerson(BASE_OUTSIDER);
  await signUp(page, outsider);

  const { context: adminContext, page: admin } = await openAdmin(browser);
  const title = THIRD;
  await admin.goto("/admin/elections");
  await createElection(admin, title, inFiveMinutes(), ["أحمد ولد باب"]);
  await publish(admin, title);
  await adminContext.close();

  await page.goto("/elections");
  await memberRow(page, title).click();
  await page.waitForURL("**/elections/**");
  await expect(page.getByText("أحمد ولد باب")).toBeVisible();

  await openIn([title], 10);
  await page.reload();
  await expect(page.getByText("التصويت للمنتسبين فقط")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole("button", { name: "تأكيد التصويت" })).toHaveCount(0);

  const visitor = await browser.newContext({ viewport: PHONE });
  const seenBy = await visitor.newPage();
  await seenBy.goto("/elections");
  await memberRow(seenBy, title).click();
  await seenBy.waitForURL("**/elections/**");
  await expect(seenBy.getByText("أحمد ولد باب")).toBeVisible();
  await expect(seenBy.getByText("سجّل الدخول للتصويت")).toBeVisible();

  await closeAndPublish(title, false);
  await seenBy.reload();
  await expect(seenBy.getByText("انتهى التصويت", { exact: true })).toBeVisible();
  await expect(seenBy.getByText("نسبة المشاركة")).toHaveCount(0);

  await closeAndPublish(title, true);
  await seenBy.reload();
  await expect(seenBy.getByText("نسبة المشاركة")).toBeVisible();
  await expect(seenBy.getByText("أحمد ولد باب")).toBeVisible();
  expect(await widerThanTheScreen(seenBy)).toBe(false);

  await visitor.close();
});
