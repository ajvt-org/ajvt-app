import { describe, it, expect, beforeEach } from "vitest";
import { DELETE } from "@/app/api/admin/members/[id]/route";
import { GET as LIST_DELETED } from "@/app/api/admin/deleted/route";
import { POST as RESTORE } from "@/app/api/admin/deleted/[id]/restore/route";
import { prisma } from "@/lib/prisma";
import { RETENTION_DAYS } from "@/lib/deletedRecords";
import { resetDb, post, del, createAdmin, signInAsAdmin } from "./helpers";

function asDelete(id: string, body: unknown) {
  return [del(`/api/admin/members/${id}`, body), { params: Promise.resolve({ id }) }] as const;
}

async function member(fullName = "محمد ولد أحمد") {
  return prisma.member.create({
    data: { fullName, age: "البدريين", paymentMethod: "بنكيلي", status: "ACTIVE" },
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

  it("brings the member back on restore", async () => {
    const m = await member();
    await DELETE(...asDelete(m.id, { confirmName: "محمد ولد أحمد" }));
    const record = await prisma.deletedRecord.findFirstOrThrow();

    const res = await RESTORE(post(`/api/admin/deleted/${record.id}/restore`, {}), {
      params: Promise.resolve({ id: record.id }),
    });

    expect(res.status).toBe(200);
    const restored = await prisma.member.findUnique({ where: { id: m.id } });
    expect(restored).toMatchObject({ fullName: "محمد ولد أحمد", status: "ACTIVE" });
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
