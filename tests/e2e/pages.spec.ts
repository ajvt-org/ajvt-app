import { test, expect, type Page } from "@playwright/test";

const PAGES = [
  "/",
  "/activities",
  "/donate",
  "/quiz",
  "/leaderboard",
  "/login",
  "/forgot-password",
  "/membership",
  "/home",
  "/profile",
];

const PROOF = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

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

async function createAccountOnly(page: Page, phone: string) {
  await page.goto("/register");
  await page.fill('input[type="tel"]', phone);
  await page.fill('input[type="password"] >> nth=0', "test1234");
  await page.fill('input[type="password"] >> nth=1', "test1234");
  await page.getByRole("button", { name: "التالي" }).click();
  await page.fill('input[name="fullName"]', "حساب بلا طلب");
  await page.selectOption("#signup-age", "البدريين");
  await page.getByRole("button", { name: "إنشاء الحساب" }).click();
  await page.waitForURL("**/home");
}

async function createMember(page: Page, phone: string) {
  await createAccountOnly(page, phone);
  await page.goto("/membership");
  await page.click("text=بنكيلي");
  await page.fill('input[type="number"]', "100");
  await page
    .locator('input[type="file"]')
    .last()
    .setInputFiles({ name: "proof.png", mimeType: "image/png", buffer: PROOF });
  await page.getByRole("button", { name: "إرسال طلب الانضمام" }).click();
  await page.waitForTimeout(2000);
}

let phoneSeq = 0;

function freshPhone() {
  phoneSeq += 1;
  return "2" + String((Date.now() + phoneSeq * 1_000) % 10_000_000).padStart(7, "0");
}

test.use({ viewport: { width: 390, height: 844 } });

test("every page renders for a visitor", async ({ page }) => {
  await sweep(page, "visitor");
});

test("every page renders for an account with no membership request", async ({ page }) => {
  await createAccountOnly(page, freshPhone());
  await sweep(page, "account with no member");
});

test("every page renders for a member", async ({ page }) => {
  await createMember(page, freshPhone());
  await sweep(page, "member");
});
