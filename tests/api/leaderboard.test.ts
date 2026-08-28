import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getLeaderboardData, toPublicEntry, SUPPORTERS_PAGE_SIZE } from "@/lib/donationsServer";
import { GET as BOARD } from "@/app/api/leaderboard/route";
import { mirrorDonation } from "@/lib/paymentMirror";
import { get } from "./helpers";
import { resetDb } from "./helpers";

async function member(fullName: string) {
  return prisma.member.create({
    data: {
      user: { create: {} },
      fullName,
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    },
  });
}

async function gift(
  amount: number,
  opts: { name?: string | null; memberId?: string; status?: "ACTIVE" | "PENDING" } = {},
) {
  const status = opts.status ?? "ACTIVE";
  const donation = await prisma.donation.create({
    data: {
      amount,
      donorName: opts.name ?? null,
      memberId: opts.memberId ?? null,
      status,
      source: opts.memberId ? "SELF" : "PUBLIC",
    },
  });
  await mirrorDonation(prisma, {
    donationId: donation.id,
    amount,
    method: null,
    proof: null,
    status,
    donorName: donation.donorName,
    donorPhoto: null,
    donorPhone: null,
    memberId: donation.memberId,
    activityId: null,
  });
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

    expect(leaderboard.filter((e) => e.memberIds.includes(m.id))).toHaveLength(2);
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
    expect(leaderboard.every((e) => e.memberIds.length === 0)).toBe(true);
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

    expect(leaderboard[0].memberIds).toEqual([m.id]);
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

  it("keeps the photo of a donor who has no account", async () => {
    const donation = await prisma.donation.create({
      data: { amount: 500, donorName: "زائر", donorPhoto: "guest.webp", status: "ACTIVE" },
    });
    await mirrorDonation(prisma, {
      donationId: donation.id,
      amount: 500,
      method: null,
      proof: null,
      status: "ACTIVE",
      donorName: "زائر",
      donorPhoto: "guest.webp",
      donorPhone: null,
      memberId: null,
      activityId: null,
    });

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
