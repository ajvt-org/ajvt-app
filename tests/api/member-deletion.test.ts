import { describe, it, expect, beforeEach } from "vitest";
import { DELETE } from "@/app/api/admin/members/[id]/route";
import { GET as LIST_DELETED } from "@/app/api/admin/deleted/route";
import { POST as RESTORE } from "@/app/api/admin/deleted/[id]/restore/route";
import { prisma } from "@/lib/prisma";
import { RETENTION_DAYS } from "@/lib/deletedRecords";
import { runningYear } from "@/lib/membershipYear";
import {
  resetDb,
  post,
  del,
  createAdmin,
  signInAsAdmin,
  withId,
  makeMember,
  personFor,
} from "./helpers";

function asDelete(id: string, body: unknown) {
  return [del(`/api/admin/members/${id}`, body), withId(id)] as const;
}

async function member(fullName = "محمد ولد أحمد") {
  return makeMember({
    fullName,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
  });
}

describe("DELETE /api/admin/members/[id]", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("refuses without the typed name", async () => {
    const m = await member();

    const res = await DELETE(...asDelete(m.id, {}));

    expect(res.status).toBe(400);
    expect(await prisma.member.count()).toBe(1);
  });

  it("refuses when the typed name is wrong", async () => {
    const m = await member();

    const res = await DELETE(...asDelete(m.id, { confirmName: "محمد" }));

    expect(res.status).toBe(400);
    expect(await prisma.member.count()).toBe(1);
  });

  it("deletes and keeps a restorable copy when the name matches", async () => {
    const m = await member();

    const res = await DELETE(...asDelete(m.id, { confirmName: "محمد ولد أحمد" }));

    expect(res.status).toBe(200);
    expect(await prisma.member.count()).toBe(0);

    const { records } = await (await LIST_DELETED()).json();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ kind: "Member", label: "محمد ولد أحمد" });
    expect(records[0].daysLeft).toBe(RETENTION_DAYS);
  });

  it("takes the years of the membership with it", async () => {
    const m = await member();
    await prisma.membership.create({
      data: { userId: m.userId, year: runningYear() - 1, status: "ACTIVE" },
    });

    await DELETE(...asDelete(m.id, { confirmName: "محمد ولد أحمد" }));

    expect(await prisma.membership.count({ where: { userId: m.userId } })).toBe(0);
  });

  it("brings those years back on restore", async () => {
    const m = await member();
    await prisma.membership.create({
      data: { userId: m.userId, year: runningYear() - 1, status: "ACTIVE" },
    });
    await DELETE(...asDelete(m.id, { confirmName: "محمد ولد أحمد" }));
    const record = await prisma.deletedRecord.findFirstOrThrow();

    await RESTORE(post(`/api/admin/deleted/${record.id}/restore`, {}), withId(record.id));

    const years = await prisma.membership.findMany({
      where: { userId: m.userId },
      orderBy: { year: "asc" },
    });
    expect(years.map((y) => y.year)).toEqual([runningYear() - 1, runningYear()]);
    expect(years[1].status).toBe("ACTIVE");
  });

  it("brings the member back on restore", async () => {
    const m = await member();
    await DELETE(...asDelete(m.id, { confirmName: "محمد ولد أحمد" }));
    const record = await prisma.deletedRecord.findFirstOrThrow();

    const res = await RESTORE(
      post(`/api/admin/deleted/${record.id}/restore`, {}),
      withId(record.id),
    );

    expect(res.status).toBe(200);
    const restored = await prisma.member.findUniqueOrThrow({ where: { id: m.id } });
    expect(restored).toMatchObject({ status: "ACTIVE" });
    expect((await personFor(m.id)).fullName).toBe("محمد ولد أحمد");
    expect(await prisma.deletedRecord.count()).toBe(0);
  });

  it("drops a backup once its window has passed", async () => {
    const m = await member();
    await DELETE(...asDelete(m.id, { confirmName: "محمد ولد أحمد" }));
    await prisma.deletedRecord.updateMany({ data: { expiresAt: new Date("2020-01-01") } });

    const { records } = await (await LIST_DELETED()).json();

    expect(records).toHaveLength(0);
    expect(await prisma.deletedRecord.count()).toBe(0);
  });
});
