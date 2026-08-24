import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, createAdmin, signInAsAdmin, createUser } from "./helpers";

import { GET as HOME } from "@/app/api/admin/home/route";

const read = () => HOME(get("/api/admin/home"));

async function member(fullName: string, over: Record<string, unknown> = {}) {
  const user = await createUser(`2${String(Math.random()).slice(2, 9)}`);
  return prisma.member.create({
    data: {
      userId: user.id,
      fullName,
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      paidAmount: 1000,
      membershipYear: 2026,
      ...over,
    },
  });
}

describe("the admin home", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.appSettings.create({
      data: { id: "singleton", membershipFee: 1000, membershipYear: 2026 },
    });
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("answers how many members are up to date", async () => {
    await member("سدد");
    await member("سابق", { membershipYear: 2025 });

    const body = await (await read()).json();

    expect(body.membership).toEqual({ current: 1, active: 2, former: 1 });
  });

  it("answers what came in and what went out", async () => {
    const paid = await member("سدد");
    await prisma.payment.create({
      data: { purpose: "DONATION", amount: 5000, status: "ACTIVE", memberId: paid.id },
    });
    await prisma.expense.create({
      data: { label: "مصروف", amount: 2000, createdBy: "boss" },
    });

    const body = await (await read()).json();

    expect(body.money).toEqual({ revenue: 5000, spending: 2000, net: 3000 });
  });

  it("leaves a payment still awaiting review out of the money that came in", async () => {
    const m = await member("سدد");
    await prisma.payment.create({
      data: { purpose: "DONATION", amount: 5000, status: "PENDING", memberId: m.id },
    });

    const body = await (await read()).json();

    expect(body.money.revenue).toBe(0);
    expect(body.handling.pendingPayments).toBe(1);
  });

  it("answers what is waiting on an admin", async () => {
    await member("منتظر", { status: "PENDING" });

    const body = await (await read()).json();

    expect(body.handling.pendingMembers).toBe(1);
    expect(body.handling.total).toBe(1);
  });

  it("answers zero on an empty association rather than failing", async () => {
    const body = await (await read()).json();

    expect(body.membership).toEqual({ current: 0, active: 0, former: 0 });
    expect(body.money).toEqual({ revenue: 0, spending: 0, net: 0 });
    expect(body.handling.total).toBe(0);
  });

  it("lists today's matches and only today's", async () => {
    const activity = await prisma.activity.create({
      data: { title: "دوري اليوم", description: "بطولة", isTournament: true, format: "KNOCKOUT" },
    });
    const home = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
    const away = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
    await prisma.match.create({
      data: {
        activityId: activity.id,
        homeTeamId: home.id,
        awayTeamId: away.id,
        matchDate: new Date(),
      },
    });
    await prisma.match.create({
      data: {
        activityId: activity.id,
        homeTeamId: away.id,
        awayTeamId: home.id,
        matchDate: new Date(Date.now() - 3 * 86_400_000),
      },
    });

    const body = await (await read()).json();

    expect(body.matchesToday).toHaveLength(1);
    expect(body.matchesToday[0].activity.title).toBe("دوري اليوم");
    expect(body.matchesToday[0].homeTeam.name).toBe("أ");
  });

  it("is closed to someone who is not signed in", async () => {
    const { clearCookies } = await import("./cookieJar");
    clearCookies();

    expect((await read()).status).toBe(401);
  });
});
