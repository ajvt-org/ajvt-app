import { describe, it, expect, beforeEach } from "vitest";
import { POST as SUBSCRIBE } from "@/app/api/push/subscribe/route";
import { POST as UNSUBSCRIBE } from "@/app/api/push/unsubscribe/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createUsers, signInAs } from "./helpers";
import { clearCookies } from "./cookieJar";

const ENDPOINT = "https://push.example.net/one";
const KEYS = { p256dh: "key", auth: "secret" };

function subscribe(endpoint = ENDPOINT) {
  return SUBSCRIBE(post("/api/push/subscribe", { endpoint, keys: KEYS }));
}

function unsubscribe(endpoint = ENDPOINT) {
  return UNSUBSCRIBE(post("/api/push/unsubscribe", { endpoint }));
}

describe("a push subscription belongs to an account", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("unsubscribes the caller's own device", async () => {
    const [owner] = await createUsers(1);
    await signInAs(owner);
    await subscribe();

    expect((await unsubscribe()).status).toBe(200);
    expect(await prisma.pushSubscription.count()).toBe(0);
  });

  it("leaves another account's device subscribed", async () => {
    const [owner, other] = await createUsers(2);
    await signInAs(owner);
    await subscribe();

    clearCookies();
    await signInAs(other);
    const res = await unsubscribe();

    expect(res.status).toBe(200);
    const kept = await prisma.pushSubscription.findUniqueOrThrow({
      where: { endpoint: ENDPOINT },
    });
    expect(kept.userId).toBe(owner.id);
  });

  it("does not touch the caller's other devices", async () => {
    const [owner] = await createUsers(1);
    await signInAs(owner);
    await subscribe();
    await subscribe("https://push.example.net/two");

    await unsubscribe();

    const left = await prisma.pushSubscription.findMany({ select: { endpoint: true } });
    expect(left.map((row) => row.endpoint)).toEqual(["https://push.example.net/two"]);
  });

  it("hands a device over when the next account subscribes on it", async () => {
    const [owner, other] = await createUsers(2);
    await signInAs(owner);
    await subscribe();

    clearCookies();
    await signInAs(other);
    expect((await subscribe()).status).toBe(200);

    const row = await prisma.pushSubscription.findUniqueOrThrow({ where: { endpoint: ENDPOINT } });
    expect(row.userId).toBe(other.id);
    expect(await prisma.pushSubscription.count()).toBe(1);
  });

  it("refuses an unsubscribe from nobody", async () => {
    const [owner] = await createUsers(1);
    await signInAs(owner);
    await subscribe();

    clearCookies();
    expect((await unsubscribe()).status).toBe(401);
    expect(await prisma.pushSubscription.count()).toBe(1);
  });
});
