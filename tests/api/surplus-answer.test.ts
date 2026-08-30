import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { PATCH, GET as MEMBER } from "@/app/api/members/[id]/route";
import { GET as ME } from "@/app/api/user/me/route";
import { resetDb, patch, get, makeMember, createUser, signInAs, withId } from "./helpers";
import { MEMBERSHIP_FEE } from "@/lib/donations";

async function supporter(paid = MEMBERSHIP_FEE * 5) {
  const user = await createUser("22007788");
  const member = await makeMember({
    userId: user.id,
    fullName: "محمد ولد أحمد",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    paidAmount: paid,
  });
  await signInAs(await prisma.user.findUniqueOrThrow({ where: { id: user.id } }));
  return member;
}

const answer = (memberId: string, surplusAnonymous: boolean) =>
  PATCH(patch(`/api/members/${memberId}`, { surplusAnonymous }), withId(memberId));

const asProfileReadsIt = async () => (await (await ME(get("/api/user/me"))).json()).members[0];

const asTheFormReadsIt = async (memberId: string) =>
  (await (await MEMBER(get(`/api/members/${memberId}`), withId(memberId))).json()).surplusAnonymous;

const onTheBoard = async () =>
  (await prisma.payment.findFirstOrThrow({ where: { purpose: "MEMBERSHIP" } })).anonymous;

describe("the answer a member gives on showing their support", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("reads back as given once they ask to stay unnamed", async () => {
    const member = await supporter();

    await answer(member.id, true);

    expect(await onTheBoard()).toBe(true);
    expect((await asProfileReadsIt()).surplusAnonymous).toBe(true);
    expect(await asTheFormReadsIt(member.id)).toBe(true);
  });

  it("reads back as given once they ask to be named again", async () => {
    const member = await supporter();
    await answer(member.id, true);

    await answer(member.id, false);

    expect(await onTheBoard()).toBe(false);
    expect((await asProfileReadsIt()).surplusAnonymous).toBe(false);
    expect(await asTheFormReadsIt(member.id)).toBe(false);
  });

  it("comes back on the patch that saved it", async () => {
    const member = await supporter();

    const body = await (await answer(member.id, true)).json();

    expect(body.surplusAnonymous).toBe(true);
  });

  it("is no for a member who paid the fee and nothing more", async () => {
    await supporter(MEMBERSHIP_FEE);

    expect((await asProfileReadsIt()).surplusAnonymous).toBe(false);
  });
});
