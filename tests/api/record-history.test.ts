import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, createAdmin, signInAsAdmin } from "./helpers";

import { GET as HISTORY } from "@/app/api/admin/history/route";

const read = (targetType: string, targetId: string) =>
  HISTORY(get(`/api/admin/history?targetType=${targetType}&targetId=${targetId}`));

async function entry(targetType: string, targetId: string, action: string, at?: Date) {
  return prisma.auditLog.create({
    data: {
      adminUsername: "boss",
      action,
      targetType,
      targetId,
      targetLabel: "مصروف",
      before: { amount: 100 },
      after: { amount: 200 },
      ...(at ? { createdAt: at } : {}),
    },
  });
}

describe("the history of one money record", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("hands back the changes made to that record", async () => {
    await entry("Expense", "e1", "UPDATE_EXPENSE");

    const body = await (await read("Expense", "e1")).json();

    expect(body.history).toHaveLength(1);
    expect(body.history[0]).toMatchObject({
      action: "UPDATE_EXPENSE",
      adminUsername: "boss",
      before: { amount: 100 },
      after: { amount: 200 },
    });
  });

  it("never mixes in another record's history", async () => {
    await entry("Expense", "e1", "UPDATE_EXPENSE");
    await entry("Expense", "e2", "DELETE_EXPENSE");

    const body = await (await read("Expense", "e1")).json();

    expect(body.history).toHaveLength(1);
  });

  it("keeps a payment's history apart from an expense with the same id", async () => {
    await entry("Expense", "same", "UPDATE_EXPENSE");
    await entry("Donation", "same", "UPDATE_DONATION");

    const body = await (await read("Donation", "same")).json();

    expect(body.history.map((h: { action: string }) => h.action)).toEqual(["UPDATE_DONATION"]);
  });

  it("puts the most recent change first", async () => {
    await entry("Expense", "e1", "CREATE_EXPENSE", new Date("2026-01-01T00:00:00Z"));
    await entry("Expense", "e1", "UPDATE_EXPENSE", new Date("2026-06-01T00:00:00Z"));

    const body = await (await read("Expense", "e1")).json();

    expect(body.history.map((h: { action: string }) => h.action)).toEqual([
      "UPDATE_EXPENSE",
      "CREATE_EXPENSE",
    ]);
  });

  it("answers a record nothing has happened to with an empty list", async () => {
    const body = await (await read("Expense", "never-touched")).json();

    expect(body.history).toEqual([]);
  });

  it("refuses a target type that is not a money record", async () => {
    expect((await read("User", "u1")).status).toBe(400);
  });

  it("refuses a request with no target", async () => {
    expect((await HISTORY(get("/api/admin/history"))).status).toBe(400);
  });

  it("is closed to an admin who is not SUPER", async () => {
    await signInAsAdmin(await createAdmin("helper", "MEMBERS"));

    expect((await read("Expense", "e1")).status).toBe(403);
  });

  it("finds a membership decision under the member it was about", async () => {
    await entry("Member", "m1", "APPROVE_MEMBER");

    const body = await (await read("Member", "m1")).json();

    expect(body.history.map((h: { action: string }) => h.action)).toEqual(["APPROVE_MEMBER"]);
  });

  it("finds an activity decision under its registration", async () => {
    await entry("ActivityRegistration", "r1", "APPROVE_REGISTRATION");

    const body = await (await read("ActivityRegistration", "r1")).json();

    expect(body.history.map((h: { action: string }) => h.action)).toEqual(["APPROVE_REGISTRATION"]);
  });
});
