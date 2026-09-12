import { describe, it, expect, beforeEach } from "vitest";
import { GET as FINANCE } from "@/app/api/admin/activities/[id]/finance/route";
import { prisma } from "@/lib/prisma";
import { donationMirrorOf, mirrorDonation } from "@/lib/paymentMirror";
import { resetDb, get, createAdmin, signInAsAdmin, withId } from "./helpers";

async function activity(title = "القافلة الصحية") {
  return prisma.activity.create({ data: { title, description: "وصف" } });
}

async function gift(data: {
  donorName?: string;
  amount: number;
  status: "ACTIVE" | "PENDING" | "REJECTED";
  activityId: string;
}) {
  const donation = await prisma.donation.create({ data });
  await mirrorDonation(prisma, donationMirrorOf(donation));
  return donation;
}

function finance(id: string) {
  return FINANCE(get(`/api/admin/activities/${id}/finance`), withId(id));
}

describe("GET /api/admin/activities/[id]/finance", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is closed to an admin who is not full", async () => {
    await signInAsAdmin(await createAdmin("activities-only", "ACTIVITIES"));
    const a = await activity();

    expect((await finance(a.id)).status).toBe(403);
  });

  it("returns an empty ledger for an activity with no money", async () => {
    await signInAsAdmin(await createAdmin());
    const a = await activity();

    const body = await (await finance(a.id)).json();

    expect(body.rows).toEqual([]);
    expect(body.totals).toEqual({ income: 0, expenses: 0, balance: 0 });
  });

  it("gathers only this activity's income and spending", async () => {
    await signInAsAdmin(await createAdmin());
    const mine = await activity();
    const other = await activity("البطولة");

    await gift({ donorName: "أحمد", amount: 500, status: "ACTIVE", activityId: mine.id });
    await gift({ donorName: "سالم", amount: 900, status: "ACTIVE", activityId: other.id });
    await prisma.expense.create({
      data: { label: "أدوية", amount: 200, createdBy: "admin", activityId: mine.id },
    });
    await prisma.expense.create({
      data: { label: "كرات", amount: 50, createdBy: "admin", activityId: other.id },
    });

    const body = await (await finance(mine.id)).json();

    expect(body.rows).toHaveLength(2);
    expect(body.totals).toEqual({ income: 500, expenses: 200, balance: 300 });
  });

  it("leaves a rejected donation out of the ledger", async () => {
    await signInAsAdmin(await createAdmin());
    const a = await activity();
    await gift({ donorName: "أحمد", amount: 500, status: "REJECTED", activityId: a.id });

    expect((await (await finance(a.id)).json()).totals.income).toBe(0);
  });

  it("names an anonymous giver rather than leaving the row blank", async () => {
    await signInAsAdmin(await createAdmin());
    const a = await activity();
    await gift({ amount: 300, status: "ACTIVE", activityId: a.id });

    const body = await (await finance(a.id)).json();

    expect(body.rows[0].label).toBe("فاعل خير");
  });

  it("leaves a membership payment out of the income even when it names the activity", async () => {
    await signInAsAdmin(await createAdmin());
    const a = await activity();
    const user = await prisma.user.create({ data: { phone: "22110111", fullName: "عضو" } });
    await prisma.payment.create({
      data: {
        purpose: "MEMBERSHIP",
        amount: 1000,
        feeApplied: 1000,
        year: 2026,
        status: "ACTIVE",
        userId: user.id,
        activityId: a.id,
      },
    });
    await gift({ donorName: "أحمد", amount: 500, status: "ACTIVE", activityId: a.id });

    const body = await (await finance(a.id)).json();

    expect(body.rows).toHaveLength(1);
    expect(body.totals.income).toBe(500);
  });

  it("is a 404 for an activity that does not exist", async () => {
    await signInAsAdmin(await createAdmin());

    expect((await finance("missing-id")).status).toBe(404);
  });
});
