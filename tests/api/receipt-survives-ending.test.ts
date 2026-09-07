import { describe, it, expect, beforeEach } from "vitest";
import { POST as END, DELETE as RESTORE } from "@/app/api/admin/members/[id]/end-membership/route";
import { POST as VALIDATE } from "@/app/api/admin/validate/route";
import { POST as SUBMIT } from "@/app/api/members/route";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  post,
  del,
  withId,
  createAdmin,
  createUser,
  signInAs,
  signInAsAdmin,
} from "./helpers";
import { clearCookies } from "./cookieJar";

const PAYMENT = { paymentMethod: "بنكيلي", paymentProof: "proof.webp", paidAmount: 1000 };
const REIMBURSED = "استُرجعت رسوم الانتساب";

async function asAdmin() {
  if (await prisma.admin.count()) return;
  await signInAsAdmin(await createAdmin("members-admin", "MEMBERS"));
}

async function acceptedMember(phone?: string) {
  const user = await createUser(phone);
  await signInAs(user);
  await SUBMIT(post("/api/members", PAYMENT));
  clearCookies();
  const membership = await prisma.membership.findFirstOrThrow({ where: { userId: user.id } });
  await asAdmin();
  await VALIDATE(post("/api/admin/validate", { id: user.id, action: "ACTIVE" }));
  return membership;
}

function end(userId: string) {
  return END(
    post(`/api/admin/members/${userId}/end-membership`, { reason: REIMBURSED }),
    withId(userId),
  );
}

describe("the receipt for a membership that was ended", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("stands, keeps its number and stays attached to its payment", async () => {
    const membership = await acceptedMember();
    const issued = await prisma.receipt.findFirstOrThrow();

    await end(membership.userId);

    const receipt = await prisma.receipt.findUniqueOrThrow({ where: { id: issued.id } });
    expect(receipt.status).toBe("ACTIVE");
    expect(receipt.number).toBe(issued.number);
    expect(receipt.paymentId).toBe(issued.paymentId);
    expect(receipt.voidReason).toBeNull();
    expect(receipt.voidedAt).toBeNull();
  });

  it("is not reissued under a new number", async () => {
    const membership = await acceptedMember();

    await end(membership.userId);

    expect(await prisma.receipt.count()).toBe(1);
  });

  it("keeps the money on the books, since ending is not a refusal", async () => {
    const membership = await acceptedMember();

    await end(membership.userId);

    const payment = await prisma.payment.findFirstOrThrow({ where: { purpose: "MEMBERSHIP" } });
    expect(payment.status).toBe("ACTIVE");
    expect(payment.amount).toBe(PAYMENT.paidAmount);
  });

  it("is still standing after the ending is taken back", async () => {
    const membership = await acceptedMember();
    await end(membership.userId);

    await RESTORE(
      del(`/api/admin/members/${membership.userId}/end-membership`),
      withId(membership.userId),
    );

    const receipt = await prisma.receipt.findFirstOrThrow();
    expect(receipt.status).toBe("ACTIVE");
  });

  it("is still withdrawn when the proof itself is refused after acceptance", async () => {
    const membership = await acceptedMember();

    await VALIDATE(
      post("/api/admin/validate", {
        id: membership.userId,
        action: "REJECTED",
        rejectionReason: "لم يتم العثور على العملية",
      }),
    );

    const receipt = await prisma.receipt.findFirstOrThrow();
    expect(receipt.status).toBe("VOID");
  });
});
