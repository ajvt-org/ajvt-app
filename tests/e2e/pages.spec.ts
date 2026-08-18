import { test, expect, type Page } from "@playwright/test";

// The proxy table in src/proxy.test.ts says where each caller is sent. This
// says the page they land on actually renders: a server component that throws
// answers 500, which no amount of routing coverage would notice.
//
// The three states are the ones that differ in what the page has to draw: no
// account at all, an account with nothing attached to it, and an account with
// a membership request behind it.
const PAGES = [
  "/",
  "/activities",
  "/donate",
  "/quiz",
  "/leaderboard",
  "/login",
  "/forgot-password",
  "/form",
  "/home",
  "/profile",
];

const PROOF = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

// What a broken page looks like from outside: src/app/error.tsx catches the
// throw and renders this, inside the same app-shell, with a 200 and no console
// error. Status and markup both say nothing, so the boundary's own words are
// the signal.
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

// Steps 1 and 2 of the join form create the account. Stopping there is exactly
// the state of someone who signed up and never finished.
async function createAccountOnly(page: Page, phone: string) {
  await page.goto("/form");
  await page.fill('input[name="fullName"]', "حساب بلا طلب");
  await page.fill('input[type="tel"]', phone);
  await page.selectOption("select", "البدريين");
  await page.getByRole("button", { name: "التالي" }).click();
  await page.fill('input[type="password"] >> nth=0', "test1234");
  await page.fill('input[type="password"] >> nth=1', "test1234");
  await page.getByRole("button", { name: "التالي" }).click();
  await page.waitForTimeout(1500);
}

async function createMember(page: Page, phone: string) {
  await createAccountOnly(page, phone);
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

// Unique per run, so the spec can be repeated without truncating the database.
// The counter matters as much as the clock, since parallel workers can land in
// the same millisecond.
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
