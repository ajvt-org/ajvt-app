import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { WAITING_DAYS } from "@/lib/waitingRequests";
import {
  resetDb,
  get,
  post,
  createUser,
  createAdmin,
  signInAsAdmin,
  signInAs,
  makeMember,
} from "./helpers";

process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
process.env.VAPID_PRIVATE_KEY = "test-private-key";

const sent = vi.hoisted(() => ({ calls: [] as string[] }));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(async (s: { endpoint: string }) => {
      sent.calls.push(s.endpoint);
    }),
  },
}));

const { GET: WAITING } = await import("@/app/api/admin/waiting/route");
const { POST: CHASE } = await import("@/app/api/admin/waiting/chase/route");

const ago = (days: number) => new Date(Date.now() - days * 86_400_000);
const read = () => WAITING(get("/api/admin/waiting"));

async function pendingMember(phone: string, name: string, days: number) {
  const user = await createUser(phone);
  await prisma.user.update({ where: { id: user.id }, data: { createdAt: ago(days) } });
  const member = await makeMember({
    userId: user.id,
    fullName: name,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "PENDING",
    createdAt: ago(days),
  });
  return { user, member };
}

async function subscribe(userId: string) {
  await prisma.pushSubscription.create({
    data: { userId, endpoint: `https://push.example/${userId}`, p256dh: "k", auth: "a" },
  });
}

describe("requests that have been waiting", () => {
  beforeEach(async () => {
    await resetDb();
    sent.calls = [];
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("lists a request that has waited past the delay", async () => {
    await pendingMember("22000001", "صابر", WAITING_DAYS + 3);

    const body = await (await read()).json();

    expect(body.pending.map((r: { name: string }) => r.name)).toEqual(["صابر"]);
  });

  it("leaves a fresh request alone", async () => {
    await pendingMember("22000001", "جديد", 1);

    expect((await (await read()).json()).pending).toEqual([]);
  });

  it("surfaces an account that never finished the form", async () => {
    const user = await createUser("22000002");
    await prisma.user.update({ where: { id: user.id }, data: { createdAt: ago(30) } });

    const body = await (await read()).json();

    expect(body.unfinished).toHaveLength(1);
    expect(body.unfinished[0].days).toBeGreaterThanOrEqual(30);
  });

  it("does not call an account unfinished once it has a member", async () => {
    await pendingMember("22000001", "له طلب", 30);

    expect((await (await read()).json()).unfinished).toEqual([]);
  });

  it("puts whoever has waited longest first", async () => {
    await pendingMember("22000001", "قريب", WAITING_DAYS + 1);
    await pendingMember("22000002", "بعيد", WAITING_DAYS + 40);

    const body = await (await read()).json();

    expect(body.pending.map((r: { name: string }) => r.name)).toEqual(["بعيد", "قريب"]);
  });

  it("chases one in a single call", async () => {
    const { user } = await pendingMember("22000001", "صابر", WAITING_DAYS + 3);
    await subscribe(user.id);

    const res = await CHASE(post("/api/admin/waiting/chase", { userId: user.id, kind: "pending" }));

    expect(res.status).toBe(200);
    expect((await res.json()).reached).toBe(1);
    expect(sent.calls).toEqual([`https://push.example/${user.id}`]);
  });

  it("says it reached nobody when the member has no device", async () => {
    const { user } = await pendingMember("22000001", "صابر", WAITING_DAYS + 3);

    const res = await CHASE(post("/api/admin/waiting/chase", { userId: user.id, kind: "pending" }));

    expect((await res.json()).reached).toBe(0);
    expect(sent.calls).toEqual([]);
  });

  it("says it reached nobody when the member has silenced reminders", async () => {
    const { user } = await pendingMember("22000001", "صابر", WAITING_DAYS + 3);
    await subscribe(user.id);
    await prisma.notificationPreference.create({
      data: { userId: user.id, category: "REQUEST_REMINDER", enabled: false },
    });

    const res = await CHASE(post("/api/admin/waiting/chase", { userId: user.id, kind: "pending" }));

    expect((await res.json()).reached).toBe(0);
    expect(sent.calls).toEqual([]);
  });

  it("still reaches a member who silenced other categories", async () => {
    const { user } = await pendingMember("22000001", "صابر", WAITING_DAYS + 3);
    await subscribe(user.id);
    await prisma.notificationPreference.create({
      data: { userId: user.id, category: "BROADCAST", enabled: false },
    });

    const res = await CHASE(post("/api/admin/waiting/chase", { userId: user.id, kind: "pending" }));

    expect((await res.json()).reached).toBe(1);
  });

  it("writes the chase to the audit log", async () => {
    const { user } = await pendingMember("22000001", "صابر", WAITING_DAYS + 3);

    await CHASE(post("/api/admin/waiting/chase", { userId: user.id, kind: "unfinished" }));

    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { action: "CHASE_WAITING_REQUEST" },
    });
    expect(entry.targetId).toBe(user.id);
  });

  it("refuses a chase with no target", async () => {
    expect((await CHASE(post("/api/admin/waiting/chase", { kind: "pending" }))).status).toBe(400);
  });

  it("is closed to a member", async () => {
    const { clearCookies } = await import("./cookieJar");
    clearCookies();
    const user = await createUser("22000003");
    await signInAs(user);

    expect((await read()).status).toBe(401);
  });
});
