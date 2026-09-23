import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { activities } from "@/lib/messages";
import { getLeaderboardData } from "@/lib/donationsServer";
import { GET as BOARD } from "@/app/api/activities/[id]/supporters/route";
import { resetDb, get, withId, giveGift, makeMember } from "./helpers";

function activity(data: { published?: boolean } = {}) {
  return prisma.activity.create({ data: { title: "القافلة الصحية", description: "وصف", ...data } });
}

function named(donorName: string, amount: number, activityId: string | null = null) {
  return giveGift({ amount, anonymous: false, donorName, activityId });
}

const read = (id: string, query = "") =>
  BOARD(get(`/api/activities/${id}/supporters${query}`), withId(id));

const names = (rows: { name: string }[]) => rows.map((row) => row.name);

describe("the supporters board of one activity", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("carries a gift to that activity and to no other", async () => {
    const caravan = await activity();
    const league = await activity();
    await named("محمد", 5000, caravan.id);

    expect(names((await (await read(caravan.id)).json()).rows)).toEqual(["محمد"]);
    expect((await (await read(league.id)).json()).rows).toEqual([]);
  });

  it("leaves general support off every activity board", async () => {
    const caravan = await activity();
    await named("أحمد", 3000);

    const board = await (await read(caravan.id)).json();

    expect(board).toEqual({ rows: [], total: 0, given: 0 });
  });

  it("still counts an activity gift on the association's board", async () => {
    const caravan = await activity();
    await named("محمد", 5000, caravan.id);

    const { leaderboard } = await getLeaderboardData({});

    expect(names(leaderboard)).toContain("محمد");
  });

  it("totals what the activity was given and leaves pending gifts out", async () => {
    const caravan = await activity();
    await named("محمد", 5000, caravan.id);
    await named("أحمد", 2000, caravan.id);
    await giveGift({ amount: 9000, anonymous: true, activityId: caravan.id, status: "PENDING" });

    const board = await (await read(caravan.id)).json();

    expect(board.total).toBe(2);
    expect(board.given).toBe(7000);
  });

  it("ranks the same gifts in the same order as the main board", async () => {
    const caravan = await activity();
    await named("أحمد", 2000, caravan.id);
    await named("محمد", 5000, caravan.id);
    await named("سيدي", 3000, caravan.id);

    const board = await (await read(caravan.id)).json();
    const { leaderboard } = await getLeaderboardData({});

    expect(names(board.rows)).toEqual(names(leaderboard));
  });

  it("keeps one row for a member giving anonymously several times", async () => {
    const caravan = await activity();
    const member = await makeMember({
      fullName: "عضو",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    });
    for (const amount of [1000, 2000]) {
      await giveGift({
        amount,
        anonymous: true,
        userId: member.id,
        source: "SELF",
        activityId: caravan.id,
      });
    }

    const board = await (await read(caravan.id)).json();

    expect(board.rows).toHaveLength(1);
    expect(board.rows[0].total).toBe(3000);
  });

  it("pages like the main board", async () => {
    const caravan = await activity();
    await named("محمد", 5000, caravan.id);
    await named("أحمد", 2000, caravan.id);

    const board = await (await read(caravan.id, "?offset=1")).json();

    expect(names(board.rows)).toEqual(["أحمد"]);
    expect(board.total).toBe(2);
  });

  it.each([
    ["an unpublished activity", true],
    ["an activity that does not exist", false],
  ])("answers not found for %s", async (_label, exists) => {
    const id = exists ? (await activity({ published: false })).id : "missing";

    const res = await read(id);

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe(activities.notFound);
  });
});
