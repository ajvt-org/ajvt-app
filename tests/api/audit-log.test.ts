import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { AUDIT_PAGE_SIZE } from "@/lib/auditFilters";
import { AUDIT_LOGIN_ACTION, AUDIT_LOGIN_DAYS, AUDIT_LOG_DAYS } from "@/lib/auditRetention";
import { resetDb, get, createAdmin, signInAsAdmin } from "./helpers";

import { GET as LOGS } from "@/app/api/admin/audit-log/route";

const read = (query = "") => LOGS(get(`/api/admin/audit-log${query}`));

function daysAgo(days: number): Date {
  const at = new Date();
  at.setDate(at.getDate() - days);
  return at;
}

const dayOf = (at: Date) => at.toISOString().slice(0, 10);

function entry(over: Record<string, unknown> = {}) {
  return prisma.auditLog.create({
    data: {
      adminUsername: "boss",
      action: "APPROVE_MEMBER",
      targetType: "Member",
      createdAt: daysAgo(10),
      ...over,
    },
  });
}

describe("reading the action log", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("is closed to an admin who is not a full admin", async () => {
    await signInAsAdmin(await createAdmin("acts", "ACTIVITIES"));

    expect((await read()).status).toBe(403);
  });

  it("reports the total beside the page, so the reader knows what is missing", async () => {
    for (let i = 0; i < AUDIT_PAGE_SIZE + 5; i++) await entry();

    const body = await (await read()).json();

    expect(body.total).toBe(AUDIT_PAGE_SIZE + 5);
    expect(body.logs).toHaveLength(AUDIT_PAGE_SIZE);
    expect(body.page).toBe(1);
  });

  it("hands out the rest on the next page", async () => {
    for (let i = 0; i < AUDIT_PAGE_SIZE + 5; i++) await entry();

    const body = await (await read("?page=2")).json();

    expect(body.logs).toHaveLength(5);
    expect(body.page).toBe(2);
  });

  it("narrows by admin, by action and by target", async () => {
    await entry({ adminUsername: "boss", action: "APPROVE_MEMBER", targetType: "Member" });
    await entry({ adminUsername: "other", action: "APPROVE_MEMBER", targetType: "Member" });
    await entry({ adminUsername: "boss", action: "CREATE_TEAM", targetType: "Team" });

    expect((await (await read("?admin=boss")).json()).total).toBe(2);
    expect((await (await read("?action=CREATE_TEAM")).json()).total).toBe(1);
    expect((await (await read("?target=Member")).json()).total).toBe(2);
  });

  it("takes a day range from either side, ends included", async () => {
    const oldest = daysAgo(40);
    const middle = daysAgo(20);
    const newest = daysAgo(5);
    await entry({ createdAt: oldest });
    await entry({ createdAt: middle });
    await entry({ createdAt: newest });

    const range = `?from=${dayOf(oldest)}&to=${dayOf(middle)}`;
    expect((await (await read(range)).json()).total).toBe(2);
    expect((await (await read(`?from=${dayOf(daysAgo(6))}`)).json()).total).toBe(1);
    expect((await (await read(`?to=${dayOf(oldest)}`)).json()).total).toBe(1);
  });

  it("combines the filters rather than taking only the last one", async () => {
    await entry({ adminUsername: "boss", action: "APPROVE_MEMBER" });
    await entry({ adminUsername: "boss", action: "CREATE_TEAM" });
    await entry({ adminUsername: "other", action: "APPROVE_MEMBER" });

    expect((await (await read("?admin=boss&action=APPROVE_MEMBER")).json()).total).toBe(1);
  });

  it("offers the values that are actually in the log to filter by", async () => {
    await entry({ adminUsername: "boss", action: "APPROVE_MEMBER", targetType: "Member" });
    await entry({ adminUsername: "other", action: "CREATE_TEAM", targetType: "Team" });

    const body = await (await read()).json();

    expect(body.admins).toEqual(["boss", "other"]);
    expect(body.actions).toEqual(["APPROVE_MEMBER", "CREATE_TEAM"]);
    expect(body.targets).toEqual(["Member", "Team"]);
  });

  it("leaves a row with no target out of the target choices", async () => {
    await entry({ targetType: null });

    expect((await (await read()).json()).targets).toEqual([]);
  });

  it("puts the newest first", async () => {
    await entry({ action: "APPROVE_MEMBER", createdAt: daysAgo(20) });
    await entry({ action: "CREATE_TEAM", createdAt: daysAgo(5) });

    const { logs } = await (await read()).json();

    expect(logs.map((l: { action: string }) => l.action)).toEqual([
      "CREATE_TEAM",
      "APPROVE_MEMBER",
    ]);
  });
});

describe("how far back the action log is kept", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("drops an entry older than the window when the log is read", async () => {
    await entry({ createdAt: daysAgo(AUDIT_LOG_DAYS + 1) });
    await entry({ createdAt: daysAgo(AUDIT_LOG_DAYS - 1) });

    expect((await (await read()).json()).total).toBe(1);
    expect(await prisma.auditLog.count()).toBe(1);
  });

  it("drops a login sooner than the rest", async () => {
    const at = daysAgo(AUDIT_LOGIN_DAYS + 1);
    await entry({ action: AUDIT_LOGIN_ACTION, targetType: null, createdAt: at });
    await entry({ action: "APPROVE_MEMBER", createdAt: at });

    const { logs } = await (await read()).json();

    expect(logs.map((l: { action: string }) => l.action)).toEqual(["APPROVE_MEMBER"]);
  });

  it("keeps a login inside its own window", async () => {
    await entry({
      action: AUDIT_LOGIN_ACTION,
      targetType: null,
      createdAt: daysAgo(AUDIT_LOGIN_DAYS - 1),
    });

    expect((await (await read()).json()).total).toBe(1);
  });

  it("writes no entry of its own, so the table can empty", async () => {
    await entry({ createdAt: daysAgo(AUDIT_LOG_DAYS + 1) });

    await read();

    expect(await prisma.auditLog.count()).toBe(0);
  });
});
