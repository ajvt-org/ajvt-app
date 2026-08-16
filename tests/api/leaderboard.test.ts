import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getLeaderboardData, toPublicEntry } from "@/lib/donationsServer";
import { resetDb } from "./helpers";

async function member(fullName: string) {
  return prisma.member.create({
    data: {
      fullName,
      phone: "22334455",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    },
  });
}

async function gift(amount: number, opts: { name?: string | null; memberId?: string } = {}) {
  return prisma.donation.create({
    data: {
      amount,
      donorName: opts.name ?? null,
      memberId: opts.memberId ?? null,
      status: "ACTIVE",
      source: opts.memberId ? "SELF" : "PUBLIC",
    },
  });
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
    await prisma.donation.create({
      data: { amount: 9999, donorName: "محمد", memberId: m.id, status: "PENDING", source: "SELF" },
    });

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
});
