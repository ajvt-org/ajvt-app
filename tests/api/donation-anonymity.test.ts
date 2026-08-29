import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, createUsers, makeMember } from "./helpers";
import { donationMirrorOf, mirrorDonation } from "@/lib/paymentMirror";
import { getLeaderboardData } from "@/lib/donationsServer";
import { money } from "@/lib/messages";

async function aGift(over: Record<string, unknown>) {
  const donation = await prisma.donation.create({
    data: { amount: 2000, status: "ACTIVE", source: "PUBLIC", ...over },
  });
  await mirrorDonation(prisma, donationMirrorOf(donation));
  return donation;
}

describe("a giver's choice to stay unnamed", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is carried onto the payment as its own answer", async () => {
    const donation = await aGift({ anonymous: true, donorName: null });

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: donation.id } });
    expect(payment.anonymous).toBe(true);
  });

  it("keeps the name that was typed in, so it survives being hidden", async () => {
    await aGift({ anonymous: true, donorName: "أحمد سالم" });

    const payment = await prisma.payment.findFirstOrThrow();
    expect(payment.anonymous).toBe(true);
    expect(payment.donorName).toBe("أحمد سالم");
  });

  it("hides a named gift from the board once it is marked anonymous", async () => {
    await aGift({ anonymous: true, donorName: "أحمد سالم" });

    const { leaderboard } = await getLeaderboardData();
    expect(leaderboard[0].name).toBe(money.anonymousDonor);
    expect(leaderboard[0].anonymous).toBe(true);
  });

  it("hides the account too, not just the typed name", async () => {
    const [user] = await createUsers(1);
    const member = await makeMember({
      userId: user.id,
      fullName: "أبوبكر لمرابط",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    });
    await aGift({
      anonymous: true,
      donorName: "ابو",
      memberId: member.id,
      userId: user.id,
      source: "SELF",
    });

    const { leaderboard } = await getLeaderboardData();
    expect(leaderboard[0].name).toBe(money.anonymousDonor);
  });

  it("names a gift the giver did not ask to hide", async () => {
    await aGift({ anonymous: false, donorName: "أحمد سالم" });

    const { leaderboard } = await getLeaderboardData();
    expect(leaderboard[0].name).toBe("أحمد سالم");
    expect(leaderboard[0].anonymous).toBe(false);
  });
});
