import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/ages/standings/route";
import { prisma } from "@/lib/prisma";
import { resetDb, makeMember } from "./helpers";

async function group(name: string, totalCount: number) {
  return prisma.ageGroup.create({ data: { name, totalCount } });
}

async function member(age: string, status: "PENDING" | "ACTIVE" | "REJECTED") {
  return makeMember({
    fullName: `عضو ${age} ${status}`,
    age,
    paymentMethod: "بنكيلي",
    status,
  });
}

async function standings() {
  return (await (await GET()).json()).standings;
}

describe("GET /api/ages/standings", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("counts a member who renewed once, not once for every year", async () => {
    await group("البدريين", 10);
    const renewed = await member("البدريين", "ACTIVE");
    await prisma.membership.create({
      data: {
        userId: renewed.userId,
        year: new Date().getUTCFullYear() + 1,
        status: "ACTIVE",
        paymentMethod: "بنكيلي",
      },
    });

    expect(await standings()).toMatchObject([{ name: "البدريين", members: 1, rate: 10 }]);
  });

  it("counts only approved members", async () => {
    await group("البدريين", 10);
    await member("البدريين", "ACTIVE");
    await member("البدريين", "PENDING");
    await member("البدريين", "REJECTED");

    expect(await standings()).toMatchObject([{ name: "البدريين", members: 1, rate: 10 }]);
  });

  it("ranks the fuller group first and keeps empty groups", async () => {
    await group("البدريين", 30);
    await group("أشبال", 30);
    await member("أشبال", "ACTIVE");

    expect(await standings()).toMatchObject([
      { rank: 1, name: "أشبال", members: 1 },
      { rank: 2, name: "البدريين", members: 0, rate: 0 },
    ]);
  });

  it("defaults an unset headcount to thirty", async () => {
    await prisma.ageGroup.create({ data: { name: "الفتيان" } });

    expect((await standings())[0].total).toBe(30);
  });
});
