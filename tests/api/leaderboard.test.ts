import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getLeaderboardData, toPublicEntry, SUPPORTERS_PAGE_SIZE } from "@/lib/donationsServer";
import { GET as BOARD } from "@/app/api/leaderboard/route";
import { donationMirrorOf, mirrorDonation } from "@/lib/paymentMirror";
import { get, makeMember } from "./helpers";
import { resetDb } from "./helpers";

async function member(fullName: string) {
  return makeMember({
    fullName,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
  });
}

async function gift(
  amount: number,
  opts: { name?: string | null; memberId?: string; status?: "ACTIVE" | "PENDING" } = {},
) {
  const status = opts.status ?? "ACTIVE";
  const owner = opts.memberId
    ? await prisma.member.findUniqueOrThrow({
        where: { id: opts.memberId },
        select: { userId: true },
      })
    : null;
  const donation = await prisma.donation.create({
    data: {
      amount,
      anonymous: opts.name == null,
      donorName: opts.name ?? null,
      memberId: opts.memberId ?? null,
      userId: owner?.userId ?? null,
      status,
      source: opts.memberId ? "SELF" : "PUBLIC",
    },
  });
  await mirrorDonation(prisma, donationMirrorOf(donation));
  return donation;
}

const ANON = "فاعل خير";

describe("the supporters board", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("splits one person's named and unnamed giving into two rows", async () => {
    const m = await member("محمد");
    await gift(500, { memberId: m.id, name: "محمد" });
    await gift(10000, { memberId: m.id });

    const { leaderboard } = await getLeaderboardData();

    expect(leaderboard).toHaveLength(2);
    expect(leaderboard.find((e) => e.anonymous)?.total).toBe(10000);
    expect(leaderboard.find((e) => !e.anonymous)?.total).toBe(500);
  });

  it("marks both rows as the same account, so the owner can be shown both", async () => {
    const m = await member("محمد");
    await gift(500, { memberId: m.id, name: "محمد" });
    await gift(10000, { memberId: m.id });

    const { leaderboard } = await getLeaderboardData();

    expect(leaderboard.filter((e) => e.accountIds.includes(m.userId))).toHaveLength(2);
  });

  it("keeps one person's repeated unnamed giving in a single row", async () => {
    const m = await member("محمد");
    await gift(4000, { memberId: m.id });
    await gift(6000, { memberId: m.id });

    const { leaderboard } = await getLeaderboardData();

    expect(leaderboard).toHaveLength(1);
    expect(leaderboard[0].total).toBe(10000);
    expect(leaderboard[0].anonymous).toBe(true);
  });

  it("gives every unattributable gift its own row, having nothing to group on", async () => {
    await gift(3000);
    await gift(7000);

    const { leaderboard } = await getLeaderboardData();

    expect(leaderboard).toHaveLength(2);
    expect(leaderboard.every((e) => e.anonymous)).toBe(true);
    expect(leaderboard.every((e) => e.accountIds.length === 0)).toBe(true);
  });

  it("never names an unnamed giver", async () => {
    const m = await member("محمد");
    await gift(10000, { memberId: m.id });

    const { leaderboard } = await getLeaderboardData();

    expect(leaderboard[0].name).toBe(ANON);
    expect(leaderboard[0].photoUrl).toBeNull();
  });

  it("ranks anonymous rows among the rest by amount, not below them", async () => {
    const m = await member("محمد");
    await gift(500, { memberId: m.id, name: "محمد" });
    await gift(9000);
    await gift(200, { name: "زائر" });

    const { leaderboard } = await getLeaderboardData();

    expect(leaderboard.map((e) => e.total)).toEqual([9000, 500, 200]);
    expect(leaderboard[0].anonymous).toBe(true);
  });

  it("leaves out gifts still awaiting review", async () => {
    const m = await member("محمد");
    await gift(500, { memberId: m.id, name: "محمد" });
    await gift(9999, { memberId: m.id, name: "محمد", status: "PENDING" });

    const { leaderboard } = await getLeaderboardData();

    expect(leaderboard).toHaveLength(1);
    expect(leaderboard[0].total).toBe(500);
  });

  it("never hands the account behind an anonymous row to the browser", async () => {
    const m = await member("محمد");
    await gift(10000, { memberId: m.id });

    const { leaderboard } = await getLeaderboardData();
    const sent = leaderboard.map(toPublicEntry);

    expect(leaderboard[0].accountIds).toEqual([m.userId]);
    expect(Object.keys(sent[0])).toEqual(["rank", "name", "photoUrl", "total", "anonymous"]);
    expect(JSON.stringify(sent)).not.toContain(m.id);
  });

  it("counts what a membership payment carried past the fee, and not the fee", async () => {
    const m = await member("محمد");
    const { recordMembershipPayment } = await import("@/lib/membershipPaymentServer");
    await recordMembershipPayment(prisma, m.id, 1000, 100);

    const { leaderboard } = await getLeaderboardData();

    expect(leaderboard).toHaveLength(1);
    expect(leaderboard[0].total).toBe(900);
  });

  it("leaves a member who paid the fee and nothing more off the board", async () => {
    const m = await member("محمد");
    const { recordMembershipPayment } = await import("@/lib/membershipPaymentServer");
    await recordMembershipPayment(prisma, m.id, 100, 100);

    const { leaderboard } = await getLeaderboardData();

    expect(leaderboard).toHaveLength(0);
  });

  it("shows the account name, not the name typed onto a linked gift", async () => {
    const m = await member("أبوبكر لمرابط");
    await gift(2000, { memberId: m.id, name: "ابو" });

    const { leaderboard } = await getLeaderboardData();

    expect(leaderboard[0].name).toBe("أبوبكر لمرابط");
  });

  it("keeps one row for an account however its gifts were named", async () => {
    const m = await member("أبوبكر لمرابط");
    await gift(500, { memberId: m.id, name: "ابو" });
    await gift(300, { memberId: m.id, name: "أبوبكر" });

    const { leaderboard } = await getLeaderboardData();

    expect(leaderboard).toHaveLength(1);
    expect(leaderboard[0].name).toBe("أبوبكر لمرابط");
    expect(leaderboard[0].total).toBe(800);
  });

  it("hides a linked giver who asked to stay unnamed, account name and all", async () => {
    const m = await member("أبوبكر لمرابط");
    await gift(2000, { memberId: m.id });

    const { leaderboard } = await getLeaderboardData();

    expect(leaderboard[0].name).toBe(ANON);
  });

  it("keeps the photo of a donor who has no account", async () => {
    const donation = await prisma.donation.create({
      data: { amount: 500, donorName: "زائر", donorPhoto: "guest.webp", status: "ACTIVE" },
    });
    await mirrorDonation(prisma, donationMirrorOf(donation));

    const { leaderboard } = await getLeaderboardData();

    expect(leaderboard[0].photoUrl).toBe("/api/files/donation/guest.webp");
  });

  it("hands back one page at a time, however many supporters there are", async () => {
    const extra = SUPPORTERS_PAGE_SIZE + 5;
    for (let i = 0; i < extra; i++) await gift(100 + i, { name: `داعم ${i}` });

    const body = await (await BOARD(get("/api/leaderboard"))).json();

    expect(body.total).toBe(extra);
    // The button that asks for more loads a page, not the remainder. It used to
    // print the remainder next to itself and promise more than it delivered.
    expect(body.rows).toHaveLength(SUPPORTERS_PAGE_SIZE);
  });

  it("keeps paging from an offset until the rows run out", async () => {
    const extra = SUPPORTERS_PAGE_SIZE + 5;
    for (let i = 0; i < extra; i++) await gift(100 + i, { name: `داعم ${i}` });

    const second = await (
      await BOARD(get(`/api/leaderboard?offset=${SUPPORTERS_PAGE_SIZE}`))
    ).json();

    expect(second.rows).toHaveLength(5);
    expect(second.rows[0].rank).toBe(SUPPORTERS_PAGE_SIZE + 1);
  });
});
