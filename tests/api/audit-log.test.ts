import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { AUDIT_PAGE_SIZE } from "@/lib/auditFilters";
import { resetDb, get, createAdmin, signInAsAdmin } from "./helpers";

import { GET as LOGS } from "@/app/api/admin/audit-log/route";

const read = (query = "") => LOGS(get(`/api/admin/audit-log${query}`));

function entry(over: Record<string, unknown> = {}) {
  return prisma.auditLog.create({
    data: {
      adminUsername: "boss",
      action: "APPROVE_MEMBER",
      targetType: "Member",
      createdAt: new Date("2026-03-15T10:00:00.000Z"),
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
    await entry({ createdAt: new Date("2026-03-01T00:00:00.000Z") });
    await entry({ createdAt: new Date("2026-03-31T23:30:00.000Z") });
    await entry({ createdAt: new Date("2026-04-02T10:00:00.000Z") });

    expect((await (await read("?from=2026-03-01&to=2026-03-31")).json()).total).toBe(2);
    expect((await (await read("?from=2026-04-01")).json()).total).toBe(1);
    expect((await (await read("?to=2026-03-01")).json()).total).toBe(1);
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
    await entry({ action: "APPROVE_MEMBER", createdAt: new Date("2026-03-01T10:00:00.000Z") });
    await entry({ action: "CREATE_TEAM", createdAt: new Date("2026-03-20T10:00:00.000Z") });

    const { logs } = await (await read()).json();

    expect(logs.map((l: { action: string }) => l.action)).toEqual([
      "CREATE_TEAM",
      "APPROVE_MEMBER",
    ]);
  });
});
