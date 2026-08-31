import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { recordMembershipPayment } from "@/lib/membershipPaymentServer";
import { getLeaderboardData } from "@/lib/donationsServer";
import { resetDb, createUsers, makeMember } from "./helpers";

async function aMemberWhoGaveMore() {
  const [user] = await createUsers(1);
  const member = await makeMember({
    fullName: "أبوبكر لمرابط",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    userId: user.id,
    membershipYear: 2026,
  });
  await recordMembershipPayment(prisma, member.userId, 2000, 100);
  return { member };
}

describe("the surplus of a membership payment", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("counts once on the board, as support and not as the fee", async () => {
    const { member } = await aMemberWhoGaveMore();

    const { leaderboard } = await getLeaderboardData();
    const row = leaderboard.find((e) => e.accountIds.includes(member.userId));

    expect(row?.total).toBe(1900);
  });

  it("is not a donation anyone can file, because no such row exists", async () => {
    const { member } = await aMemberWhoGaveMore();

    const donations = await prisma.donation.findMany({ where: { userId: member.userId } });

    expect(donations).toEqual([]);
  });

  it("leaves one payment carrying the whole transfer", async () => {
    const { member } = await aMemberWhoGaveMore();

    const rows = await prisma.payment.findMany({ where: { userId: member.userId } });

    expect(rows).toHaveLength(1);
    expect(rows[0].purpose).toBe("MEMBERSHIP");
    expect(rows[0].amount).toBe(2000);
    expect(rows[0].feeApplied).toBe(100);
  });
});
