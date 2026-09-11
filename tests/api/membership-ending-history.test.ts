import { describe, it, expect, beforeEach } from "vitest";
import { POST as END, DELETE as RESTORE } from "@/app/api/admin/members/[id]/end-membership/route";
import { GET as MEMBERSHIPS } from "@/app/api/admin/members/[id]/memberships/route";
import { PUT as PAYMENT } from "@/app/api/admin/members/[id]/payment/route";
import { POST as VALIDATE } from "@/app/api/admin/validate/route";
import { POST as SUBMIT } from "@/app/api/members/route";
import { prisma } from "@/lib/prisma";
import { AMOUNT_BELOW_FEE, MEMBERSHIP_ENDING_REASONS } from "@/lib/texts";
import type { EndingRecord } from "@/lib/membershipEndingHistory";
import {
  resetDb,
  get,
  post,
  put,
  del,
  withId,
  createAdmin,
  createUser,
  signInAs,
  signInAsAdmin,
} from "./helpers";
import { clearCookies } from "./cookieJar";

const MONEY = { paymentMethod: "بنكيلي", paymentProof: "proof.webp", paidAmount: 1000 };
const REIMBURSED = MEMBERSHIP_ENDING_REASONS[0];
const BREACH = MEMBERSHIP_ENDING_REASONS[2];

async function asAdmin() {
  if (await prisma.admin.count()) return;
  await signInAsAdmin(await createAdmin("members-admin", "MEMBERS"));
}

async function acceptedMember() {
  const user = await createUser();
  await signInAs(user);
  await SUBMIT(post("/api/members", MONEY));
  clearCookies();
  const membership = await prisma.membership.findFirstOrThrow({ where: { userId: user.id } });
  await asAdmin();
  await VALIDATE(post("/api/admin/validate", { id: membership.userId, action: "ACTIVE" }));
  return membership;
}

function end(userId: string, reason = REIMBURSED) {
  return END(post(`/api/admin/members/${userId}/end-membership`, { reason }), withId(userId));
}

function restore(userId: string) {
  return RESTORE(del(`/api/admin/members/${userId}/end-membership`), withId(userId));
}

async function endings(userId: string): Promise<EndingRecord[]> {
  const response = await MEMBERSHIPS(
    get(`/api/admin/members/${userId}/memberships`),
    withId(userId),
  );
  const body = (await response.json()) as { endings: EndingRecord[] };
  return body.endings;
}

describe("what a membership card knows about its endings", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("says nothing about a membership that was never ended", async () => {
    const membership = await acceptedMember();

    expect(await endings(membership.userId)).toEqual([]);
  });

  it("keeps the ending after the restore has cleared the columns", async () => {
    const membership = await acceptedMember();
    await end(membership.userId, BREACH);
    await restore(membership.userId);

    const [record] = await endings(membership.userId);

    expect(record.year).toBe(membership.year);
    expect(record.reason).toBe(BREACH);
    expect(record.endedBy).toBe("members-admin");
    expect(record.restoredBy).toBe("members-admin");
    expect(record.restoredAt).not.toBeNull();
    const row = await prisma.membership.findUniqueOrThrow({ where: { id: membership.id } });
    expect(row.endedAt).toBeNull();
  });

  it("holds two endings on one membership apart", async () => {
    const membership = await acceptedMember();
    await end(membership.userId, REIMBURSED);
    await restore(membership.userId);
    await end(membership.userId, BREACH);

    const records = await endings(membership.userId);

    expect(records.map((record) => record.reason)).toEqual([REIMBURSED, BREACH]);
    expect(records[0].restoredAt).not.toBeNull();
    expect(records[1].restoredAt).toBeNull();
  });

  it("tells the same story about an ending the payment route recorded", async () => {
    const membership = await acceptedMember();

    await PAYMENT(
      put(`/api/admin/members/${membership.userId}/payment`, {
        amountTransferred: 50,
        membershipDecision: "end",
      }),
      withId(membership.userId),
    );
    await restore(membership.userId);

    const [record] = await endings(membership.userId);

    expect(record.reason).toBe(AMOUNT_BELOW_FEE);
    expect(record.endedBy).toBe("members-admin");
    expect(record.restoredAt).not.toBeNull();
  });
});
