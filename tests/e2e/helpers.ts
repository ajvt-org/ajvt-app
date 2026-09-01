import { randomInt } from "node:crypto";
import type { Browser, BrowserContext, Page } from "@playwright/test";

const PROOF = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export interface Person {
  phone: string;
  password: string;
  fullName: string;
  village?: string;
  age?: string;
}

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const RUN = String(randomInt(10_000)).padStart(4, "0");
const SEQUENCE_WIDTH = 3;

let issued = 0;

export function freshPhone(): string {
  issued += 1;
  if (issued >= 10 ** SEQUENCE_WIDTH) {
    throw new Error("the run has issued every phone number it reserved");
  }
  return `2${RUN}${String(issued).padStart(SEQUENCE_WIDTH, "0")}`;
}

export function freshName(base: string): string {
  const tag = [...RUN].map((digit) => ARABIC_DIGITS[Number(digit)]).join("");
  return `${base} ${tag}`;
}

export function freshPerson<T extends { fullName: string; password: string }>(
  person: T,
): T & Person {
  return { ...person, fullName: freshName(person.fullName), phone: freshPhone() };
}

export async function signUp(page: Page, person: Person) {
  await page.goto("/register");

  await page.fill('input[type="tel"]', person.phone);
  await page.fill('input[type="password"] >> nth=0', person.password);
  await page.fill('input[type="password"] >> nth=1', person.password);
  await page.getByRole("button", { name: "التالي" }).click();

  await page.fill('input[name="fullName"]', person.fullName);
  if (person.village) await page.selectOption("#signup-village", person.village);
  if (person.age) await page.selectOption("#signup-age", person.age);
  await page.getByRole("button", { name: "إنشاء الحساب" }).click();
  await page.waitForURL("**/home");
}

export async function attachProof(page: Page) {
  await page
    .locator('input[type="file"]')
    .last()
    .setInputFiles({ name: "proof.png", mimeType: "image/png", buffer: PROOF });
}

export async function submitMembership(page: Page, paymentMethod: string, amount = "100") {
  await page.click(`text=${paymentMethod}`);
  await page.fill('input[type="number"]', amount);
  await attachProof(page);
  await page.getByRole("button", { name: "إرسال طلب الانضمام" }).click();
}

export async function openAdmin(
  browser: Browser,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("/admin/login");
  await page.fill('input[type="text"]', "admin");
  await page.fill('input[type="password"]', "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin");
  await page.goto("/admin/dashboard");

  return { context, page };
}

export async function acceptPayment(adminPage: Page, fullName: string) {
  await adminPage.getByText(fullName).first().click();
  await adminPage.getByRole("button", { name: "قبول الدفع", exact: true }).click();
}
