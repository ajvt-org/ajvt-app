import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { isPaidUpMember, paidUpMembers, paidUpMemberCount } from "@/lib/memberStanding";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { endMembership } from "@/lib/membershipEndingServer";
import { MEMBERSHIP_ENDING_REASONS } from "@/lib/texts";
import { resetDb, makeMember, createUser } from "./helpers";
import { runningYear } from "@/lib/membershipYear";

const YEAR = runningYear();

async function member(fullName: string, over: Record<string, unknown> = {}) {
  const user = await createUser(`2${String(Math.random()).slice(2, 9)}`);
  await makeMember({
    userId: user.id,
    fullName,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    paidAmount: MEMBERSHIP_FEE,
    membershipYear: YEAR,
    ...over,
  });
  return user;
}

function endFor(userId: string, year = YEAR) {
  return endMembership(prisma, userId, year, {
    reason: MEMBERSHIP_ENDING_REASONS[0],
    by: "members-admin",
    at: new Date(),
  });
}

describe("who stands in good membership", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("takes a member who is accepted and has covered the fee", async () => {
    const user = await member("محمد ولد أحمد");

    expect(await isPaidUpMember(user.id)).toBe(true);
  });

  it("turns away an account still waiting on review", async () => {
    const user = await member("منتظر", { status: "PENDING" });

    expect(await isPaidUpMember(user.id)).toBe(false);
  });

  it("turns away a member who paid less than the fee", async () => {
    const user = await member("ناقص", { paidAmount: MEMBERSHIP_FEE - 1 });

    expect(await isPaidUpMember(user.id)).toBe(false);
  });

  it("counts the same people it lists", async () => {
    await member("أحمد");
    await member("باه");
    await member("منتظر", { status: "PENDING" });

    expect(await paidUpMemberCount()).toBe(2);
    expect(await paidUpMemberCount()).toBe((await paidUpMembers()).length);
  });

  it("drops a member out of the count once their membership ends", async () => {
    await member("أحمد");
    const dropped = await member("باه");
    await endFor(dropped.id);

    expect(await paidUpMemberCount()).toBe(1);
  });

  it("counts a member once however many years they hold", async () => {
    const user = await member("متعدد", { membershipYear: YEAR - 1 });
    await prisma.membership.create({ data: { userId: user.id, year: YEAR, status: "ACTIVE" } });

    expect(await paidUpMemberCount()).toBe(1);
  });

  it("counts nobody when nobody has joined", async () => {
    expect(await paidUpMemberCount()).toBe(0);
  });
});
