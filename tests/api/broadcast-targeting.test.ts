import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createAdmin, signInAsAdmin, makeMember } from "./helpers";

const sendPushToUsers = vi.hoisted(() =>
  vi.fn<(userIds: string[], payload: { title: string; body: string }) => Promise<void>>(
    async () => {},
  ),
);
const sendPushIgnoringPreferences = vi.hoisted(() =>
  vi.fn<(userIds: string[], payload: { title: string; body: string }) => Promise<void>>(
    async () => {},
  ),
);
vi.mock("@/lib/push", () => ({ sendPushToUsers, sendPushIgnoringPreferences }));

const { POST } = await import("@/app/api/admin/notifications/broadcast/route");

const reached = () => sendPushToUsers.mock.calls.flatMap((call) => call[0]).sort();

const MESSAGE = { title: "إعلان", body: "نص الإعلان" };

function broadcast(body: Record<string, unknown>) {
  return POST(post("/api/admin/notifications/broadcast", { ...MESSAGE, ...body }));
}

async function member(fullName: string, over: Record<string, unknown> = {}) {
  const created = await makeMember({
    fullName,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    ...over,
  });
  return prisma.member.findUniqueOrThrow({ where: { id: created.id }, select: { userId: true } });
}

async function activityWith(userId: string) {
  const activity = await prisma.activity.create({
    data: { title: "نشاط", description: "وصف" },
  });
  await prisma.activityRegistration.create({
    data: { activityId: activity.id, userId, status: "ACTIVE" },
  });
  return activity;
}

describe("POST /api/admin/notifications/broadcast", () => {
  beforeEach(async () => {
    await resetDb();
    sendPushToUsers.mockClear();
    sendPushIgnoringPreferences.mockClear();
    await signInAsAdmin(await createAdmin());
  });

  it("reaches every active member when it is for everyone", async () => {
    const one = await member("محمد ولد أحمد");
    const two = await member("سالم ولد علي", { age: "الفرسان" });

    const res = await broadcast({ target: "ALL" });

    expect(res.status).toBe(200);
    expect(reached()).toEqual([one.userId, two.userId].sort());
  });

  it("leaves out an account still waiting on review", async () => {
    const active = await member("محمد ولد أحمد");
    await member("منتظر", { status: "PENDING" });

    await broadcast({ target: "ALL" });

    expect(reached()).toEqual([active.userId]);
  });

  it("reaches only the accounts of the age group it names", async () => {
    const badri = await member("محمد ولد أحمد");
    await member("سالم ولد علي", { age: "الفرسان" });

    const res = await broadcast({ target: "AGE", age: "البدريين" });

    expect(res.status).toBe(200);
    expect(reached()).toEqual([badri.userId]);
  });

  it("reaches only the accounts registered for the activity it names", async () => {
    const registered = await member("محمد ولد أحمد");
    await member("سالم ولد علي");
    const activity = await activityWith(registered.userId);

    const res = await broadcast({ target: "ACTIVITY", activityId: activity.id });

    expect(res.status).toBe(200);
    expect(reached()).toEqual([registered.userId]);
  });

  it("counts the accounts it reached", async () => {
    await member("محمد ولد أحمد");
    await member("سالم ولد علي");

    const body = await (await broadcast({ target: "ALL" })).json();

    expect(body.recipientCount).toBe(2);
  });

  it("goes around the preferences when it is told to", async () => {
    const one = await member("محمد ولد أحمد");

    await broadcast({ target: "ALL", toEveryone: true });

    expect(sendPushIgnoringPreferences.mock.calls[0][0]).toEqual([one.userId]);
    expect(sendPushToUsers).not.toHaveBeenCalled();
  });
});
