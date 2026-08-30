import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  get,
  createUser,
  createAdmin,
  signInAsAdmin,
  signInAs,
  withId,
  makeMember,
} from "./helpers";

import { GET as ADMIN_RECEIPTS } from "@/app/api/admin/members/[id]/receipts/route";
import { GET as MY_RECEIPTS } from "@/app/api/user/receipts/route";
import { ensureReceiptsFor } from "@/lib/paymentReceiptServer";

const read = (memberId: string) =>
  ADMIN_RECEIPTS(get(`/api/admin/members/${memberId}/receipts`), withId(memberId));

async function memberWithPayment(phone: string, fullName: string, amount: number) {
  const user = await createUser(phone);
  const member = await makeMember({
    userId: user.id,
    fullName,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    memberNumber: `AJVT-${phone.slice(-4)}`,
    paidAmount: amount,
    membershipYear: 2026,
  });
  await ensureReceiptsFor(prisma, {});
  return { user, member };
}

describe("a receipt an admin can produce for a member", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("hands back that member's accepted payments", async () => {
    const { member } = await memberWithPayment("22000001", "محمد", 1000);
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    const body = await (await read(member.id)).json();

    expect(body.receipts).toHaveLength(1);
    expect(body.receipts[0]).toMatchObject({
      amount: 1000,
      payerName: "محمد",
      reason: "اشتراك عضوية 2026",
      status: "ACTIVE",
    });
    expect(body.receipts[0].number).toMatch(/^R-\d{4}-\d{4}$/);
  });

  it("never mixes in another member's payments", async () => {
    const mine = await memberWithPayment("22000001", "محمد", 1000);
    await memberWithPayment("22000002", "أحمد", 9000);
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    const body = await (await read(mine.member.id)).json();

    expect(body.receipts.map((r: { amount: number }) => r.amount)).toEqual([1000]);
  });

  it("leaves a payment still awaiting review out", async () => {
    const { member } = await memberWithPayment("22000001", "محمد", 1000);
    await prisma.payment.create({
      data: {
        purpose: "DONATION",
        amount: 500,
        status: "PENDING",
        userId: member.userId,
      },
    });
    await ensureReceiptsFor(prisma, {});
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    const body = await (await read(member.id)).json();

    expect(body.receipts).toHaveLength(1);
  });

  it("is closed to a member session, which is not an admin session", async () => {
    const { user, member } = await memberWithPayment("22000001", "محمد", 1000);
    await signInAs(user);

    expect((await read(member.id)).status).toBe(401);
  });

  it("is closed to nobody at all", async () => {
    const { member } = await memberWithPayment("22000001", "محمد", 1000);

    expect((await read(member.id)).status).toBe(401);
  });

  it("shows the member the same receipt the admin sees", async () => {
    const { user, member } = await memberWithPayment("22000001", "محمد", 1000);
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
    const asAdmin = (await (await read(member.id)).json()).receipts;

    const { clearCookies } = await import("./cookieJar");
    clearCookies();
    await signInAs(user);
    const asMember = (await (await MY_RECEIPTS(get("/api/user/receipts"))).json()).receipts;

    expect(asMember).toEqual(asAdmin);
  });

  it("leaves a cancelled receipt out of the list", async () => {
    const { member } = await memberWithPayment("22000001", "محمد", 1000);
    await prisma.receipt.updateMany({ data: { status: "VOID" } });
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    expect((await (await read(member.id)).json()).receipts).toEqual([]);
  });

  it("answers an empty list for a member who has paid nothing", async () => {
    const user = await createUser("22000009");
    const member = await makeMember({
      userId: user.id,
      fullName: "بلا دفع",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    });
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    expect((await (await read(member.id)).json()).receipts).toEqual([]);
  });
});
