import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { PATCH } from "@/app/api/admin/donations/[id]/route";
import { recordMembershipPayment } from "@/lib/membershipPaymentServer";
import { getLeaderboardData } from "@/lib/donationsServer";
import {
  resetDb,
  patch,
  createAdmin,
  createUsers,
  signInAsAdmin,
  makeMember,
  withId,
} from "./helpers";

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
  await recordMembershipPayment(prisma, member.id, 2000, 100);
  const surplus = await prisma.donation.findFirstOrThrow({
    where: { memberId: member.id, source: "MEMBERSHIP" },
  });
  return { member, surplus };
}

const edit = (id: string, body: Record<string, unknown>) =>
  PATCH(patch(`/api/admin/donations/${id}`, body), withId(id));

describe("the surplus of a membership payment", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("counts once on the board, as support and not as the fee", async () => {
    const { member } = await aMemberWhoGaveMore();

    const { leaderboard } = await getLeaderboardData();
    const row = leaderboard.find((e) => e.memberIds.includes(member.id));

    expect(row?.total).toBe(1900);
  });

  it("refuses to be filed under an activity, which would count it twice", async () => {
    const { member, surplus } = await aMemberWhoGaveMore();
    const activity = await prisma.activity.create({
      data: { title: "القافلة الصحية", description: "وصف" },
    });

    expect((await edit(surplus.id, { activityId: activity.id })).status).toBe(400);

    const { leaderboard } = await getLeaderboardData();
    expect(leaderboard.find((e) => e.memberIds.includes(member.id))?.total).toBe(1900);
  });

  it("refuses a tag on it", async () => {
    const { surplus } = await aMemberWhoGaveMore();

    expect((await edit(surplus.id, { tagIds: [] })).status).toBe(400);
  });

  it("refuses a change of payment method on it", async () => {
    const { surplus } = await aMemberWhoGaveMore();

    expect((await edit(surplus.id, { paymentMethod: "السداد" })).status).toBe(400);
  });

  it("writes no second payment row for the same money", async () => {
    const { member, surplus } = await aMemberWhoGaveMore();

    const mirrored = await prisma.payment.findUnique({ where: { id: surplus.id } });
    const rows = await prisma.payment.findMany({ where: { memberId: member.id } });

    expect(mirrored).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows[0].purpose).toBe("MEMBERSHIP");
  });
});
