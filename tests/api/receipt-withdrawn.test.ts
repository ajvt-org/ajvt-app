import { describe, it, expect, beforeEach } from "vitest";
import { POST as VALIDATE } from "@/app/api/admin/validate/route";
import { POST as SUBMIT } from "@/app/api/members/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createAdmin, createUser, signInAs, signInAsAdmin } from "./helpers";
import { clearCookies } from "./cookieJar";

const PAYMENT = { paymentMethod: "بنكيلي", paymentProof: "proof.webp", paidAmount: 1000 };

async function submitted(phone?: string) {
  const user = await createUser(phone);
  await signInAs(user);
  await SUBMIT(post("/api/members", PAYMENT));
  clearCookies();
  return prisma.member.findFirstOrThrow({ where: { userId: user.id } });
}

async function asAdmin() {
  if (await prisma.admin.count()) return;
  await signInAsAdmin(await createAdmin("members-admin", "MEMBERS"));
}

function accept(id: string) {
  return VALIDATE(post("/api/admin/validate", { id, action: "ACTIVE" }));
}

async function acceptedMember(phone?: string) {
  const member = await submitted(phone);
  await asAdmin();
  await accept(member.id);
  return member;
}

function refuse(id: string) {
  return VALIDATE(
    post("/api/admin/validate", {
      id,
      action: "REJECTED",
      rejectionReason: "لم يتم العثور على العملية",
    }),
  );
}

describe("a receipt for money that was given back", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is issued when the payment is accepted", async () => {
    await acceptedMember();

    const receipt = await prisma.receipt.findFirstOrThrow();
    expect(receipt.status).toBe("ACTIVE");
  });

  it("is withdrawn when the accepted payment is refused", async () => {
    const member = await acceptedMember();

    await refuse(member.id);

    const receipt = await prisma.receipt.findFirstOrThrow();
    expect(receipt.status).toBe("VOID");
    expect(receipt.voidReason).toBe("أُلغي الدفع بعد قبوله");
    expect(receipt.voidedAt).not.toBeNull();
  });

  it("keeps the number and the row rather than deleting either", async () => {
    const member = await acceptedMember();
    const before = await prisma.receipt.findFirstOrThrow();

    await refuse(member.id);

    const after = await prisma.receipt.findUniqueOrThrow({ where: { id: before.id } });
    expect(after.number).toBe(before.number);
    expect(after.token).toBe(before.token);
    expect(await prisma.receipt.count()).toBe(1);
  });

  it("stays withdrawn when the payment is accepted again, since a void is final", async () => {
    const member = await acceptedMember();
    await refuse(member.id);

    await accept(member.id);

    const receipt = await prisma.receipt.findFirstOrThrow();
    expect(receipt.status).toBe("VOID");
    expect(await prisma.receipt.count()).toBe(1);
  });

  it("leaves a receipt alone while its payment is still accepted", async () => {
    await acceptedMember();
    const second = await acceptedMember("36009999");

    await refuse(second.id);

    const kept = await prisma.receipt.findMany({ where: { status: "ACTIVE" } });
    expect(kept).toHaveLength(1);
  });
});
