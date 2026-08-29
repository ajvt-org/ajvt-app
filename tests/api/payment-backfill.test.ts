import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveAppSettings } from "@/lib/settingsServer";
import { runningYear } from "@/lib/membershipYear";
import { reconcilePayments } from "@/lib/paymentReconcile";
import { splitPayment } from "@/lib/membershipPayment";
import { resetDb, makeMember } from "./helpers";

const YEAR = runningYear();
const LAST = YEAR - 1;

async function memberWith(over: Record<string, unknown> = {}) {
  return makeMember({
    fullName: "محمد ولد أحمد",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    paidAmount: 100,
    membershipYear: YEAR,
    ...over,
  });
}

async function backfill() {
  await prisma.$executeRawUnsafe(`
    INSERT INTO "Payment" ("id","purpose","amount","feeApplied","year","method","proof","status","anonymous","donorName","memberId","recordedBy","createdAt","updatedAt")
    SELECT gen_random_uuid()::TEXT,'MEMBERSHIP',
      COALESCE(ms."paidAmount",0)+COALESCE(d."amount",0),
      COALESCE((SELECT "membershipFee" FROM "AppSettings" LIMIT 1),100),
      ms."year", ms."paymentMethod", ms."paymentProof", m."status",
      COALESCE(m."surplusAnonymous",false),
      CASE WHEN COALESCE(m."surplusAnonymous",false) THEN NULL ELSE u."fullName" END,
      ms."memberId", ms."recordedBy", ms."createdAt", now()
    FROM "Membership" ms JOIN "Member" m ON m."id"=ms."memberId"
    JOIN "User" u ON u."id"=m."userId"
    LEFT JOIN "Donation" d ON d."memberId"=ms."memberId" AND d."source"='MEMBERSHIP' AND d."membershipYear"=ms."year"
    WHERE COALESCE(ms."paidAmount",0)+COALESCE(d."amount",0) > 0;
  `);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "Payment" ("id","purpose","amount","feeApplied","year","method","proof","status","anonymous","donorName","memberId","activityId","createdAt","updatedAt")
    SELECT d."id",
      CASE WHEN d."activityId" IS NOT NULL THEN 'ACTIVITY'::"PaymentPurpose" ELSE 'DONATION'::"PaymentPurpose" END,
      d."amount", NULL, NULL, d."paymentMethod", d."proof", d."status",
      (d."donorName" IS NULL), d."donorName", d."memberId", d."activityId", d."createdAt", now()
    FROM "Donation" d WHERE d."source" <> 'MEMBERSHIP' AND d."amount" IS NOT NULL;
  `);
}

describe("the backfill onto the payment table", () => {
  beforeEach(async () => {
    await resetDb();
    await saveAppSettings({ membershipYear: YEAR, membershipFee: 100 });
  });

  it("merges a year's fee and its surplus into one payment", async () => {
    const m = await memberWith();
    await prisma.membership.create({
      data: { memberId: m.id, year: YEAR, paidAmount: 100, paymentMethod: "بنكيلي" },
    });
    await prisma.donation.create({
      data: {
        memberId: m.id,
        membershipYear: YEAR,
        source: "MEMBERSHIP",
        amount: 2000,
        status: "ACTIVE",
        donorName: "محمد ولد أحمد",
      },
    });

    await backfill();

    const p = await prisma.payment.findFirstOrThrow({ where: { purpose: "MEMBERSHIP" } });
    expect(p.amount).toBe(2100);
    expect(p.feeApplied).toBe(100);
    expect(p.year).toBe(YEAR);
    expect(splitPayment(p.amount, p.feeApplied!)).toEqual({ fee: 100, surplus: 2000 });
  });

  it("keeps each year as its own payment", async () => {
    const m = await memberWith();
    for (const [year, fee, extra] of [
      [LAST, 100, 400],
      [YEAR, 100, 900],
    ] as const) {
      await prisma.membership.create({
        data: { memberId: m.id, year, paidAmount: fee, paymentMethod: "بنكيلي" },
      });
      await prisma.donation.create({
        data: {
          memberId: m.id,
          membershipYear: year,
          source: "MEMBERSHIP",
          amount: extra,
          status: "ACTIVE",
        },
      });
    }

    await backfill();

    const rows = await prisma.payment.findMany({
      where: { purpose: "MEMBERSHIP" },
      orderBy: { year: "asc" },
    });
    expect(rows.map((r) => [r.year, r.amount])).toEqual([
      [LAST, 500],
      [YEAR, 1000],
    ]);
  });

  it("carries an anonymous member's surplus across without their name", async () => {
    const m = await memberWith({ surplusAnonymous: true });
    await prisma.membership.create({ data: { memberId: m.id, year: YEAR, paidAmount: 100 } });
    await prisma.donation.create({
      data: { memberId: m.id, membershipYear: YEAR, source: "MEMBERSHIP", amount: 500 },
    });

    await backfill();

    const p = await prisma.payment.findFirstOrThrow({ where: { purpose: "MEMBERSHIP" } });
    expect(p.anonymous).toBe(true);
    expect(p.donorName).toBeNull();
  });

  it("brings public and self donations over as their own payments", async () => {
    await prisma.donation.create({
      data: { donorName: "فاعل", amount: 3000, source: "PUBLIC", status: "ACTIVE" },
    });
    await prisma.donation.create({
      data: { amount: 1500, source: "PUBLIC", status: "PENDING" },
    });

    await backfill();

    const rows = await prisma.payment.findMany({ where: { purpose: "DONATION" } });
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.amount === 3000)?.anonymous).toBe(false);
    expect(rows.find((r) => r.amount === 1500)?.anonymous).toBe(true);
    expect(rows.find((r) => r.amount === 1500)?.status).toBe("PENDING");
  });

  it("reconciles against what the old tables report", async () => {
    const m = await memberWith();
    await prisma.membership.create({ data: { memberId: m.id, year: YEAR, paidAmount: 100 } });
    await prisma.donation.create({
      data: { memberId: m.id, membershipYear: YEAR, source: "MEMBERSHIP", amount: 2000 },
    });
    await prisma.donation.create({
      data: { donorName: "فاعل", amount: 3000, source: "PUBLIC", status: "ACTIVE" },
    });

    await backfill();

    const r = await reconcilePayments();
    expect(r.mismatches).toEqual([]);
    expect(r.agrees).toBe(true);
  });

  it("notices when the two shapes disagree", async () => {
    const m = await memberWith();
    await prisma.membership.create({ data: { memberId: m.id, year: YEAR, paidAmount: 100 } });
    await backfill();

    await prisma.payment.updateMany({ data: { amount: 999 } });

    const r = await reconcilePayments();
    expect(r.agrees).toBe(false);
    expect(r.mismatches).toHaveLength(1);
    expect(r.mismatches[0]).toMatchObject({ kind: "MEMBERSHIP", old: 100, now: 999 });
  });

  it("writes nothing for a year that carries no money", async () => {
    const m = await memberWith({ paidAmount: null });
    await prisma.membership.create({ data: { memberId: m.id, year: YEAR, paidAmount: null } });

    await backfill();

    expect(await prisma.payment.count()).toBe(0);
  });
});
