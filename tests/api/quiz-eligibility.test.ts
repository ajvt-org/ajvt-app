import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { isQuizEligible, eligibleMembers } from "@/lib/quiz";
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

function renewInto(userId: string, year: number, status: "PENDING" | "ACTIVE" | "REJECTED") {
  return prisma.membership.create({
    data: { userId, year, status },
  });
}

describe("who may sit the quiz", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("takes a member who is accepted and has covered the fee", async () => {
    const user = await member("محمد ولد أحمد");

    expect(await isQuizEligible(user.id)).toBe(true);
  });

  it("turns away an account still waiting on review", async () => {
    const user = await member("منتظر", { status: "PENDING" });

    expect(await isQuizEligible(user.id)).toBe(false);
  });

  it("turns away an account that never joined", async () => {
    const user = await createUser("22001199");

    expect(await isQuizEligible(user.id)).toBe(false);
  });

  it("turns away a member who paid less than the fee", async () => {
    const user = await member("ناقص", { paidAmount: MEMBERSHIP_FEE - 1 });

    expect(await isQuizEligible(user.id)).toBe(false);
  });

  it("follows the newest year when a member has renewed", async () => {
    const user = await member("جدد", { membershipYear: YEAR - 1 });
    await renewInto(user.id, YEAR, "ACTIVE");

    expect(await isQuizEligible(user.id)).toBe(true);
  });

  it("turns away a member whose newest year is still waiting", async () => {
    const user = await member("منتظر التجديد", { membershipYear: YEAR - 1 });
    await renewInto(user.id, YEAR, "PENDING");

    expect(await isQuizEligible(user.id)).toBe(false);
  });

  it("turns away a member whose membership an admin has ended", async () => {
    const user = await member("منتهية عضويته");
    await endFor(user.id);

    expect(await isQuizEligible(user.id)).toBe(false);
  });

  it("keeps a member who is a year behind but has covered the fee", async () => {
    const user = await member("متأخر", { membershipYear: YEAR - 1 });

    expect(await isQuizEligible(user.id)).toBe(true);
  });

  it("leaves an ended membership out of the eligible list", async () => {
    const kept = await member("أحمد");
    const dropped = await member("باه");
    await endFor(dropped.id);

    expect((await eligibleMembers()).map((m) => m.userId)).toEqual([kept.id]);
  });

  it("lists an eligible member once however many years they hold", async () => {
    const user = await member("محمد ولد أحمد", { membershipYear: YEAR - 1 });
    await renewInto(user.id, YEAR, "ACTIVE");

    expect(await eligibleMembers()).toEqual([{ userId: user.id, fullName: "محمد ولد أحمد" }]);
  });

  it("lists the eligible in name order and leaves the rest out", async () => {
    const first = await member("أحمد");
    await member("باه", { status: "PENDING" });
    const third = await member("زين");

    expect((await eligibleMembers()).map((m) => m.userId)).toEqual([first.id, third.id]);
  });
});
