import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, createAdmin, signInAsAdmin } from "./helpers";

import { GET as ACTIVITY_REPORT } from "@/app/api/admin/finance/activities/route";
import { GET as FINANCE_REPORT } from "@/app/api/admin/finance/report/route";
import { GET as EXPORT } from "@/app/api/admin/export/[dataset]/route";

const read = (from: string, to: string) =>
  ACTIVITY_REPORT(get(`/api/admin/finance/activities?from=${from}&to=${to}`));

const SPAN = ["2026-01-01", "2026-12-31"] as const;

async function activity(title: string) {
  return prisma.activity.create({ data: { title, description: "نشاط" } });
}

async function income(
  amount: number,
  at: string,
  extra: { activityId?: string; tags?: string[]; purpose?: "DONATION" | "MEMBERSHIP" } = {},
) {
  return prisma.payment.create({
    data: {
      purpose: extra.purpose ?? "DONATION",
      amount,
      feeApplied: extra.purpose === "MEMBERSHIP" ? 1000 : null,
      status: "ACTIVE",
      createdAt: new Date(at),
      activityId: extra.activityId ?? null,
      tags: {
        connectOrCreate: (extra.tags ?? []).map((name) => ({ where: { name }, create: { name } })),
      },
    },
  });
}

async function spending(
  amount: number,
  at: string,
  extra: { activityId?: string; tags?: string[] } = {},
) {
  return prisma.expense.create({
    data: {
      label: "مصروف",
      amount,
      date: new Date(at),
      createdBy: "boss",
      activityId: extra.activityId ?? null,
      tags: {
        connectOrCreate: (extra.tags ?? []).map((name) => ({ where: { name }, create: { name } })),
      },
    },
  });
}

describe("the activity report over a chosen period", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("is closed to someone who is not signed in", async () => {
    const { clearCookies } = await import("./cookieJar");
    clearCookies();

    expect((await read(...SPAN)).status).toBe(401);
  });

  it("is closed to an admin without the finance section", async () => {
    await signInAsAdmin(await createAdmin("activities", "ACTIVITY"));

    expect((await read(...SPAN)).status).toBe(403);
  });

  it("refuses a period that runs backwards", async () => {
    expect((await read("2026-12-31", "2026-01-01")).status).toBe(400);
  });

  it("gives one row per activity that saw money", async () => {
    const summer = await activity("بطولة الصيف");
    const caravan = await activity("القافلة الصحية");
    await activity("نشاط بلا حركة");
    await income(900, "2026-03-01T10:00:00Z", { activityId: summer.id });
    await spending(400, "2026-03-02T10:00:00Z", { activityId: summer.id });
    await income(300, "2026-04-01T10:00:00Z", { activityId: caravan.id });

    const body = await (await read(...SPAN)).json();

    expect(body.rows.map((r: { title: string }) => r.title)).toEqual([
      "بطولة الصيف",
      "القافلة الصحية",
    ]);
    expect(body.rows[0]).toMatchObject({ income: 900, spending: 400, balance: 500 });
  });

  it("counts only what falls inside the period", async () => {
    const summer = await activity("بطولة الصيف");
    await income(900, "2025-03-01T10:00:00Z", { activityId: summer.id });
    await income(100, "2026-03-01T10:00:00Z", { activityId: summer.id });

    const body = await (await read(...SPAN)).json();

    expect(body.totals.income).toBe(100);
  });

  it("leaves a pending payment out, the way the finance report does", async () => {
    const summer = await activity("بطولة الصيف");
    await prisma.payment.create({
      data: {
        purpose: "DONATION",
        amount: 700,
        status: "PENDING",
        createdAt: new Date("2026-03-01T10:00:00Z"),
        activityId: summer.id,
      },
    });

    const body = await (await read(...SPAN)).json();

    expect(body.rows).toHaveLength(0);
  });

  it("keeps what is attached to no destination rather than dropping it", async () => {
    const summer = await activity("بطولة الصيف");
    await income(900, "2026-03-01T10:00:00Z", { activityId: summer.id });
    await spending(250, "2026-03-05T10:00:00Z");
    await income(1500, "2026-03-06T10:00:00Z", { purpose: "MEMBERSHIP" });

    const body = await (await read(...SPAN)).json();
    const general = body.rows.at(-1);

    expect(general).toMatchObject({ key: "general", kind: "general", income: 1500, spending: 250 });
  });

  it("splits an activity's spending by tag", async () => {
    const summer = await activity("بطولة الصيف");
    await spending(300, "2026-03-02T10:00:00Z", { activityId: summer.id, tags: ["نقل"] });
    await spending(100, "2026-03-03T10:00:00Z", { activityId: summer.id, tags: ["طعام"] });

    const body = await (await read(...SPAN)).json();

    expect(body.rows[0].spendingByTag).toEqual([
      { tag: "نقل", amount: 300 },
      { tag: "طعام", amount: 100 },
    ]);
  });

  it("quotes the receipt number issued against an activity gift", async () => {
    const summer = await activity("بطولة الصيف");
    const paid = await income(900, "2026-03-01T10:00:00Z", { activityId: summer.id });
    await prisma.receipt.create({
      data: {
        number: "0007",
        token: "t".repeat(32),
        payerName: "محمد",
        reason: "دعم",
        amount: 900,
        issuedOn: new Date("2026-03-01T10:00:00Z"),
        issuedBy: "boss",
        paymentId: paid.id,
      },
    });

    const body = await (await read(...SPAN)).json();

    expect(body.rows[0].receiptNumbers).toEqual(["0007"]);
  });

  it("stops quoting a receipt once it is void", async () => {
    const summer = await activity("بطولة الصيف");
    const paid = await income(900, "2026-03-01T10:00:00Z", { activityId: summer.id });
    await prisma.receipt.create({
      data: {
        number: "0008",
        token: "v".repeat(32),
        payerName: "محمد",
        reason: "دعم",
        amount: 900,
        issuedOn: new Date("2026-03-01T10:00:00Z"),
        issuedBy: "boss",
        paymentId: paid.id,
        status: "VOID",
      },
    });

    const body = await (await read(...SPAN)).json();

    expect(body.rows[0].receiptNumbers).toEqual([]);
  });

  it("totals the same income and spending as the finance report for the period", async () => {
    const summer = await activity("بطولة الصيف");
    const caravan = await activity("القافلة الصحية");
    await income(900, "2026-03-01T10:00:00Z", { activityId: summer.id });
    await income(300, "2026-04-01T10:00:00Z", { activityId: caravan.id });
    await income(1500, "2026-05-01T10:00:00Z", { purpose: "MEMBERSHIP" });
    await spending(400, "2026-03-02T10:00:00Z", { activityId: summer.id });
    await spending(250, "2026-06-02T10:00:00Z");

    const [byActivity, overall] = await Promise.all([
      (await read(...SPAN)).json(),
      (await FINANCE_REPORT(get(`/api/admin/finance/report?from=${SPAN[0]}&to=${SPAN[1]}`))).json(),
    ]);

    expect(byActivity.totals.income).toBe(overall.totals.income);
    expect(byActivity.totals.spending).toBe(overall.totals.spending);
    expect(byActivity.totals.balance).toBe(overall.totals.net);
  });

  it("exports the same rows as csv", async () => {
    const summer = await activity("بطولة الصيف");
    await income(900, "2026-03-01T10:00:00Z", { activityId: summer.id });
    await spending(400, "2026-03-02T10:00:00Z", { activityId: summer.id, tags: ["نقل"] });

    const res = await EXPORT(get(`/api/admin/export/activities?from=${SPAN[0]}&to=${SPAN[1]}`), {
      params: Promise.resolve({ dataset: "activities" }),
    });
    const csv = await res.text();

    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(csv).toContain("بطولة الصيف");
    expect(csv).toContain("نقل 400");
  });

  it("refuses the csv export without a period", async () => {
    const res = await EXPORT(get("/api/admin/export/activities"), {
      params: Promise.resolve({ dataset: "activities" }),
    });

    expect(res.status).toBe(400);
  });
});
