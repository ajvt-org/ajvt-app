import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { runningYear } from "@/lib/membershipYear";
import { saveAppSettings } from "@/lib/settingsServer";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { resetDb, put, post, createAdmin, signInAsAdmin, withId, makeMember } from "./helpers";

import { PUT as PAY } from "@/app/api/admin/members/[id]/payment/route";
import { POST as RENEW } from "@/app/api/admin/members/[id]/renew/route";

const YEAR = runningYear();
const METHOD = "بنكيلي";
const OTHER = "مصرفي";

async function paidMember(over: Record<string, unknown> = {}) {
  return makeMember({
    fullName: "محمد",
    age: "البدريين",
    status: "ACTIVE",
    membershipYear: YEAR,
    paidAmount: MEMBERSHIP_FEE,
    paymentMethod: METHOD,
    ...over,
  });
}

const accountOn = (name: string) =>
  prisma.paymentAccount.findFirstOrThrow({ where: { method: { name } } });

function paying(userId: string, body: Record<string, unknown>) {
  return [put(`/api/admin/members/${userId}/payment`, body), withId(userId)] as const;
}

const paymentOf = (userId: string, year = YEAR) =>
  prisma.payment.findFirstOrThrow({ where: { userId, year, purpose: "MEMBERSHIP" } });

const membershipOf = (userId: string, year = YEAR) =>
  prisma.membership.findUniqueOrThrow({ where: { userId_year: { userId, year } } });

describe("recording a membership payment validates against the payment", () => {
  beforeEach(async () => {
    await resetDb();
    await saveAppSettings({ membershipYear: YEAR, membershipFee: MEMBERSHIP_FEE });
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("refuses an amount below the fee", async () => {
    const m = await paidMember();

    const res = await PAY(...paying(m.userId, { amountTransferred: MEMBERSHIP_FEE - 1 }));

    expect(res.status).toBe(400);
    expect((await paymentOf(m.userId)).amount).toBe(MEMBERSHIP_FEE);
  });

  it("refuses a number that belongs to another method", async () => {
    const m = await paidMember();
    const elsewhere = await accountOn(OTHER);

    const res = await PAY(...paying(m.userId, { accountId: elsewhere.id }));

    expect(res.status).toBe(400);
    expect((await membershipOf(m.userId)).accountId).toBeNull();
  });

  it("takes the method it checks the number against from the payment", async () => {
    const m = await paidMember();
    const account = await accountOn(METHOD);
    await prisma.membership.update({
      where: { userId_year: { userId: m.userId, year: YEAR } },
      data: { paymentMethod: OTHER },
    });

    const res = await PAY(...paying(m.userId, { accountId: account.id }));

    expect(res.status).toBe(200);
    expect((await membershipOf(m.userId)).accountId).toBe(account.id);
  });

  it("refuses a closed number the payment was not already pointing at", async () => {
    const m = await paidMember();
    const account = await accountOn(METHOD);
    await prisma.paymentAccount.update({
      where: { id: account.id },
      data: { closedAt: new Date(), active: false },
    });

    expect((await PAY(...paying(m.userId, { accountId: account.id }))).status).toBe(400);
  });

  it("lets the closed number the payment already holds through", async () => {
    const m = await paidMember();
    const account = await accountOn(METHOD);
    await prisma.payment.updateMany({
      where: { userId: m.userId, year: YEAR, purpose: "MEMBERSHIP" },
      data: { accountId: account.id },
    });
    await prisma.paymentAccount.update({
      where: { id: account.id },
      data: { closedAt: new Date(), active: false },
    });

    const res = await PAY(...paying(m.userId, { accountId: account.id }));

    expect(res.status).toBe(200);
  });

  it("writes the method, the number and the proof to the membership as it did", async () => {
    const m = await paidMember();
    const account = await accountOn(METHOD);

    const res = await PAY(
      ...paying(m.userId, {
        paymentMethod: METHOD,
        accountId: account.id,
        paymentProof: "new.jpg",
        amountTransferred: MEMBERSHIP_FEE + 50,
      }),
    );

    expect(res.status).toBe(200);
    const membership = await membershipOf(m.userId);
    expect(membership.paymentMethod).toBe(METHOD);
    expect(membership.accountId).toBe(account.id);
    expect(membership.paymentProof).toBe("new.jpg");
    const payment = await paymentOf(m.userId);
    expect(payment.proof).toBe("new.jpg");
    expect(payment.amount).toBe(MEMBERSHIP_FEE + 50);
  });

  it("names the proof it replaced from the payment in the trail", async () => {
    const m = await paidMember({ paymentProof: "kept.jpg" });
    await prisma.membership.update({
      where: { userId_year: { userId: m.userId, year: YEAR } },
      data: { paymentProof: "stale.jpg" },
    });

    await PAY(...paying(m.userId, { paymentProof: "new.jpg" }));

    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { targetId: m.userId, action: "UPDATE_MEMBER_PAYMENT" },
      orderBy: { createdAt: "desc" },
    });
    expect(JSON.stringify(entry.before)).toContain("kept.jpg");
    expect(JSON.stringify(entry.before)).not.toContain("stale.jpg");
  });
});

describe("renewing a membership still writes both records", () => {
  beforeEach(async () => {
    await resetDb();
    await saveAppSettings({ membershipYear: YEAR, membershipFee: MEMBERSHIP_FEE });
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("stamps the method, the recorder and the verdict on both", async () => {
    const m = await paidMember({ membershipYear: YEAR - 1, memberNumber: "AJVT-2026-0002" });
    await saveAppSettings({ membershipYear: YEAR, membershipFee: MEMBERSHIP_FEE });

    const res = await RENEW(
      post(`/api/admin/members/${m.userId}/renew`, {
        paidAmount: MEMBERSHIP_FEE,
        paymentMethod: METHOD,
      }),
      withId(m.userId),
    );

    expect(res.status).toBe(201);
    const membership = await membershipOf(m.userId);
    expect(membership.paymentMethod).toBe(METHOD);
    expect(membership.recordedBy).toBe("boss");
    expect(membership.reviewedBy).toBe("boss");
    expect(membership.reviewedAt).not.toBeNull();
    const payment = await paymentOf(m.userId);
    expect(payment.method).toBe(METHOD);
    expect(payment.recordedBy).toBe("boss");
    expect(payment.reviewedBy).toBe("boss");
    expect(payment.reviewedAt).not.toBeNull();
  });

  it("refuses a renewal amount below the fee", async () => {
    const m = await paidMember({ membershipYear: YEAR - 1, memberNumber: "AJVT-2026-0003" });

    const res = await RENEW(
      post(`/api/admin/members/${m.userId}/renew`, {
        paidAmount: MEMBERSHIP_FEE - 1,
        paymentMethod: METHOD,
      }),
      withId(m.userId),
    );

    expect(res.status).toBe(400);
    expect(
      await prisma.membership.findUnique({
        where: { userId_year: { userId: m.userId, year: YEAR } },
      }),
    ).toBeNull();
  });

  it("refuses a renewal number that belongs to another method", async () => {
    const m = await paidMember({ membershipYear: YEAR - 1, memberNumber: "AJVT-2026-0004" });
    const elsewhere = await accountOn(OTHER);

    const res = await RENEW(
      post(`/api/admin/members/${m.userId}/renew`, {
        paidAmount: MEMBERSHIP_FEE,
        paymentMethod: METHOD,
        accountId: elsewhere.id,
      }),
      withId(m.userId),
    );

    expect(res.status).toBe(400);
  });
});
