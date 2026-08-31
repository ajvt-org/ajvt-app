import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/currentMembershipServer";
import { resetDb } from "./helpers";

async function account(fullName: string) {
  return prisma.user.create({ data: { fullName } });
}

async function membership(userId: string, year: number, over: Record<string, unknown> = {}) {
  return prisma.membership.create({
    data: { userId, year, status: "ACTIVE", paymentMethod: "بنكيلي", ...over },
  });
}

describe("the membership an account is on now", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is the only year an account that joined once has", async () => {
    const user = await account("محمد ولد أحمد");
    await membership(user.id, 2026, { paymentMethod: "مصرفي" });

    const current = await currentMembership(prisma, user.id);

    expect(current).toMatchObject({ year: 2026, status: "ACTIVE", paymentMethod: "مصرفي" });
  });

  it("is the newest year once the account has renewed", async () => {
    const user = await account("سالم ولد علي");
    await membership(user.id, 2025);
    await membership(user.id, 2026, { status: "PENDING" });

    expect(await currentMembership(prisma, user.id)).toMatchObject({
      year: 2026,
      status: "PENDING",
    });
  });

  it("stays on the last year joined when this one was never paid", async () => {
    const user = await account("أحمد ولد محمد");
    await membership(user.id, 2025);

    expect(await currentMembership(prisma, user.id)).toMatchObject({ year: 2025 });
  });

  it("is nothing for an account that never joined", async () => {
    const user = await account("عبد الله");

    expect(await currentMembership(prisma, user.id)).toBeNull();
  });

  it("never answers with another account's year", async () => {
    const mine = await account("لي");
    const theirs = await account("لهم");
    await membership(theirs.id, 2026);

    expect(await currentMembership(prisma, mine.id)).toBeNull();
  });

  it("carries the refusal reason a rejected year holds", async () => {
    const user = await account("مرفوض");
    await membership(user.id, 2026, { status: "REJECTED", rejectionReason: "proof_unreadable" });

    expect(await currentMembership(prisma, user.id)).toMatchObject({
      status: "REJECTED",
      rejectionReason: "proof_unreadable",
    });
  });
});
