import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, patch, post, postForm, createAdmin, signInAsAdmin, withId } from "./helpers";

vi.mock("@/lib/imageProcessing", async (orig) => {
  const actual = await orig<typeof import("@/lib/imageProcessing")>();
  return {
    ...actual,
    processImage: async () => ({ full: Buffer.from("f"), thumbnail: Buffer.from("t") }),
  };
});

import { POST as GIVE } from "@/app/api/donations/route";
import { POST as RECORD } from "@/app/api/admin/donations/route";
import { PATCH as UPDATE } from "@/app/api/admin/donations/[id]/route";
import { GET as REPORT } from "@/app/api/admin/finance/report/route";

let seq = 0;

function record(body: Record<string, unknown>) {
  return RECORD(post("/api/admin/donations", { amount: 5000, paymentMethod: "بنكيلي", ...body }));
}

function give() {
  const form = new FormData();
  form.append("file", new File([new Uint8Array([1, 2, 3])], "p.png", { type: "image/png" }));
  form.append("amount", "5000");
  form.append("paymentMethod", "بنكيلي");
  form.append("anonymous", "false");
  form.append("donorName", "فاعل خير");
  return GIVE(postForm("/api/donations", form, { "x-forwarded-for": `10.0.9.${++seq}` }));
}

async function paidOnOf(id: string) {
  const payment = await prisma.payment.findUnique({ where: { id }, select: { paidOn: true } });
  return payment?.paidOn ?? null;
}

describe("the day a payment was made", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("takes the day the admin recording it by hand gives", async () => {
    const { donation } = await (await record({ paidOn: "2026-06-11" })).json();

    expect(await paidOnOf(donation.id)).toEqual(new Date("2026-06-11"));
  });

  it("falls back to today when an admin records one without a day", async () => {
    const before = new Date();
    const { donation } = await (await record({})).json();

    const paidOn = await paidOnOf(donation.id);
    expect(paidOn).not.toBeNull();
    expect(paidOn!.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
  });

  it("keeps the day it arrived for a payment that came in through the app", async () => {
    const before = new Date();
    await give();

    const payment = await prisma.payment.findFirst({ select: { id: true, paidOn: true } });
    expect(payment?.paidOn).not.toBeNull();
    expect(payment!.paidOn!.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
  });

  it("stays where it is when the payment is edited without a new day", async () => {
    const { donation } = await (await record({ paidOn: "2026-06-11" })).json();
    await UPDATE(
      patch(`/api/admin/donations/${donation.id}`, { amount: 7000 }),
      withId(donation.id),
    );

    expect(await paidOnOf(donation.id)).toEqual(new Date("2026-06-11"));
  });

  it("moves when the admin corrects the day", async () => {
    const { donation } = await (await record({ paidOn: "2026-06-11" })).json();
    const body = await (
      await UPDATE(
        patch(`/api/admin/donations/${donation.id}`, { paidOn: "2026-06-20" }),
        withId(donation.id),
      )
    ).json();

    expect(await paidOnOf(donation.id)).toEqual(new Date("2026-06-20"));
    expect(body.donation.paidOn).toBe(new Date("2026-06-20").toISOString());
  });

  it("refuses a day it cannot read", async () => {
    const response = await record({ paidOn: "not a day" });

    expect(response.status).toBe(400);
  });

  it("counts a payment in the month the money moved, not the month it was typed", async () => {
    await prisma.payment.create({
      data: {
        purpose: "DONATION",
        amount: 900,
        status: "ACTIVE",
        paidOn: new Date("2026-01-28T10:00:00Z"),
        createdAt: new Date("2026-02-03T10:00:00Z"),
      },
    });

    const body = await (
      await REPORT(get("/api/admin/finance/report?from=2026-01-01&to=2026-02-28"))
    ).json();

    expect(body.months).toEqual([
      { month: "2026-01", income: 900, spending: 0, net: 900 },
      { month: "2026-02", income: 0, spending: 0, net: 0 },
    ]);
  });

  it("counts a payment recorded before the column by the day it was recorded", async () => {
    await prisma.payment.create({
      data: {
        purpose: "DONATION",
        amount: 400,
        status: "ACTIVE",
        createdAt: new Date("2026-02-03T10:00:00Z"),
      },
    });

    const body = await (
      await REPORT(get("/api/admin/finance/report?from=2026-01-01&to=2026-02-28"))
    ).json();

    expect(body.months).toEqual([
      { month: "2026-01", income: 0, spending: 0, net: 0 },
      { month: "2026-02", income: 400, spending: 0, net: 400 },
    ]);
  });
});
