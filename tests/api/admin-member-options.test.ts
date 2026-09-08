import { describe, it, expect, beforeEach } from "vitest";
import { GET as OPTIONS } from "@/app/api/admin/members/options/route";
import { prisma } from "@/lib/prisma";
import { resetDb, get, createAdmin, signInAsAdmin, createUser, makeMember } from "./helpers";
import { runningYear } from "@/lib/membershipYear";

const YEAR = runningYear();

async function member(fullName: string, over: Record<string, unknown> = {}) {
  const user = await createUser(`2${String(Math.random()).slice(2, 9)}`);
  await makeMember({
    userId: user.id,
    fullName,
    age: "البدريين",
    village: "التاكلالت",
    status: "ACTIVE",
    membershipYear: YEAR,
    ...over,
  });
  return user;
}

const options = async () =>
  (await (await OPTIONS(get("/api/admin/members/options"))).json()).members;

const names = async () =>
  (await options()).map((row: { fullName: string }) => row.fullName) as string[];

describe("the source behind the manual add picker", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("carries only the fields the picker shows", async () => {
    await member("محمد ولد أحمد");

    const [row] = await options();

    expect(Object.keys(row).sort()).toEqual(["age", "fullName", "id", "phone", "photo", "village"]);
  });

  it("names the account rather than the membership row", async () => {
    const user = await member("صاحب حساب");

    const [row] = await options();

    expect(row.id).toBe(user.id);
    expect(row.phone).toBe(user.phone);
  });

  it("puts the newest membership first", async () => {
    const old = new Date("2026-01-01T00:00:00.000Z");
    const mid = new Date("2026-05-01T00:00:00.000Z");
    const fresh = new Date("2026-09-01T00:00:00.000Z");
    await member("قديم", { createdAt: old });
    await member("جديد", { createdAt: fresh });
    await member("وسط", { createdAt: mid });

    expect(await names()).toEqual(["جديد", "وسط", "قديم"]);
  });

  it("gives an account one row, taken from its latest year", async () => {
    const user = await member("مجدد", { membershipYear: YEAR - 1, status: "REJECTED" });
    await makeMember({ userId: user.id, membershipYear: YEAR, status: "ACTIVE" });

    expect(await options()).toHaveLength(1);
  });

  it("offers nobody whose application is still waiting or was refused", async () => {
    await member("منتظر", { status: "PENDING" });
    await member("مرفوض", { status: "REJECTED" });
    await member("عضو");

    expect(await names()).toEqual(["عضو"]);
  });

  it("offers nobody who has stopped renewing", async () => {
    await member("متأخر", { membershipYear: YEAR - 1 });
    await member("عضو");

    expect(await names()).toEqual(["عضو"]);
  });

  it("offers nobody whose membership was ended", async () => {
    const ended = await member("منتهية");
    await prisma.membership.updateMany({
      where: { userId: ended.id },
      data: { endedAt: new Date("2026-06-01T00:00:00.000Z") },
    });
    await member("عضو");

    expect(await names()).toEqual(["عضو"]);
  });

  it("returns every membership rather than a page of them", async () => {
    for (let i = 0; i < 12; i++) await member(`عضو ${i}`);

    expect(await options()).toHaveLength(12);
  });

  it("refuses anyone who is not an admin", async () => {
    await resetDb();

    expect((await OPTIONS(get("/api/admin/members/options"))).status).toBe(401);
  });
});
