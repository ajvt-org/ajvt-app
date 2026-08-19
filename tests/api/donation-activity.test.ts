import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, post, patch, createAdmin, signInAsAdmin, withId } from "./helpers";

import { POST as CREATE } from "@/app/api/admin/donations/route";
import { PATCH as UPDATE } from "@/app/api/admin/donations/[id]/route";
import { GET as PROOFS } from "@/app/api/admin/payment-proofs/route";
import { GET as FINANCE } from "@/app/api/admin/activities/[id]/finance/route";

function activity(title = "القافلة الصحية") {
  return prisma.activity.create({ data: { title, description: "وصف" } });
}

function donation(amount = 5000) {
  return prisma.donation.create({
    data: { donorName: "فاعل خير", amount, source: "PUBLIC", status: "ACTIVE" },
  });
}

const update = (id: string, body: unknown) =>
  UPDATE(patch(`/api/admin/donations/${id}`, body), withId(id));

describe("attributing a donation to an activity", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("moves the money onto the activity ledger", async () => {
    const caravan = await activity();
    const gift = await donation(5000);

    expect((await update(gift.id, { activityId: caravan.id })).status).toBe(200);

    const { totals } = await (
      await FINANCE(get(`/api/admin/activities/${caravan.id}/finance`), withId(caravan.id))
    ).json();
    expect(totals.income).toBe(5000);
  });

  it("hands the gift back to the general fund when the activity is cleared", async () => {
    const caravan = await activity();
    const gift = await donation();
    await update(gift.id, { activityId: caravan.id });

    await update(gift.id, { activityId: null });

    expect((await prisma.donation.findUniqueOrThrow({ where: { id: gift.id } })).activityId).toBe(
      null,
    );
  });

  it("refuses an activity that does not exist and leaves the gift alone", async () => {
    const gift = await donation();

    const res = await update(gift.id, { activityId: "missing" });

    expect(res.status).toBe(400);
    expect((await prisma.donation.findUniqueOrThrow({ where: { id: gift.id } })).activityId).toBe(
      null,
    );
  });

  it("takes the activity when the admin records a gift by hand", async () => {
    const caravan = await activity();

    const res = await CREATE(
      post("/api/admin/donations", {
        donorName: "أحمد",
        amount: 3000,
        activityId: caravan.id,
      }),
    );

    expect(res.status).toBe(201);
    expect((await prisma.donation.findFirstOrThrow()).activityId).toBe(caravan.id);
  });

  it("refuses a hand-recorded gift pointed at an activity that does not exist", async () => {
    const res = await CREATE(
      post("/api/admin/donations", { donorName: "أحمد", amount: 3000, activityId: "missing" }),
    );

    expect(res.status).toBe(400);
    expect(await prisma.donation.count()).toBe(0);
  });

  it("reports which activity a gift belongs to in the payments list", async () => {
    const caravan = await activity();
    const gift = await donation();
    await update(gift.id, { activityId: caravan.id });

    const { proofs } = await (await PROOFS()).json();
    const row = proofs.find((p: { id: string }) => p.id === gift.id);

    expect(row.activityId).toBe(caravan.id);
    expect(row.activityTitle).toBe("القافلة الصحية");
  });
});
