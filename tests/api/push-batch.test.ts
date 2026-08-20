import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, createUsers } from "./helpers";

process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
process.env.VAPID_PRIVATE_KEY = "test-private-key";

const sent = vi.hoisted(() => ({ calls: [] as string[], live: 0, most: 0, gone: [] as string[] }));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(async (subscription: { endpoint: string }) => {
      sent.calls.push(subscription.endpoint);
      sent.live++;
      sent.most = Math.max(sent.most, sent.live);
      await new Promise((resolve) => setTimeout(resolve, 2));
      sent.live--;
      if (sent.gone.includes(subscription.endpoint)) throw { statusCode: 410 };
    }),
  },
}));

const { sendPushToUsers, PUSH_BATCH } = await import("@/lib/push");

async function subscribers(count: number) {
  const users = await createUsers(count);
  await prisma.pushSubscription.createMany({
    data: users.map((u, i) => ({
      userId: u.id,
      endpoint: `https://push.example/${u.id}-${i}`,
      p256dh: "key",
      auth: "auth",
    })),
  });
  return users;
}

const PAYLOAD = { title: "عنوان", body: "نص" };

describe("sendPushToUsers", () => {
  beforeEach(async () => {
    await resetDb();
    sent.calls = [];
    sent.live = 0;
    sent.most = 0;
    sent.gone = [];
  });

  it("reads every subscription in one query rather than one per member", async () => {
    const users = await subscribers(60);
    const findMany = vi.spyOn(prisma.pushSubscription, "findMany");

    await sendPushToUsers(
      users.map((u) => u.id),
      PAYLOAD,
    );

    expect(findMany).toHaveBeenCalledTimes(1);
    findMany.mockRestore();
  });

  it("reaches every subscriber", async () => {
    const users = await subscribers(60);

    await sendPushToUsers(
      users.map((u) => u.id),
      PAYLOAD,
    );

    expect(sent.calls).toHaveLength(60);
  });

  it("keeps the burst under the batch size", async () => {
    const users = await subscribers(60);

    await sendPushToUsers(
      users.map((u) => u.id),
      PAYLOAD,
    );

    expect(sent.most).toBeLessThanOrEqual(PUSH_BATCH);
  });

  it("asks nothing of the database when nobody is targeted", async () => {
    const findMany = vi.spyOn(prisma.pushSubscription, "findMany");

    await sendPushToUsers([], PAYLOAD);

    expect(findMany).not.toHaveBeenCalled();
    findMany.mockRestore();
  });

  it("drops a subscription the browser has retired", async () => {
    const users = await subscribers(2);
    const dead = await prisma.pushSubscription.findFirstOrThrow({
      where: { userId: users[0].id },
    });
    sent.gone = [dead.endpoint];

    await sendPushToUsers(
      users.map((u) => u.id),
      PAYLOAD,
    );

    expect(await prisma.pushSubscription.count()).toBe(1);
  });
});
