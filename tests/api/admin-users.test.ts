import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/users/route";
import { DELETE } from "@/app/api/admin/users/[id]/route";
import { POST as RESTORE } from "@/app/api/admin/deleted/[id]/restore/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, del, createAdmin, createUser, signInAsAdmin, withId } from "./helpers";

function asDelete(id: string, body: unknown) {
  return [del(`/api/admin/users/${id}`, body), withId(id)] as const;
}

async function bareUser(phone = "36000001") {
  return createUser(phone);
}

async function userWithMember(phone = "36000002") {
  const user = await createUser(phone);
  await prisma.member.create({
    data: { userId: user.id, fullName: "محمد ولد أحمد", age: "البدريين", paymentMethod: "بنكيلي" },
  });
  return user;
}

describe("GET /api/admin/users", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("lists only the accounts with no membership request", async () => {
    const bare = await bareUser();
    await userWithMember();

    const { users } = await (await GET()).json();

    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ id: bare.id, phone: bare.phone, hasPush: false });
  });

  it("says which accounts can receive a push", async () => {
    const bare = await bareUser();
    await prisma.pushSubscription.create({
      data: { userId: bare.id, endpoint: "https://push.example/x", p256dh: "k", auth: "a" },
    });

    const { users } = await (await GET()).json();

    expect(users[0].hasPush).toBe(true);
  });

  it("lists the newest account first", async () => {
    const older = await bareUser("36000003");
    await prisma.user.update({
      where: { id: older.id },
      data: { createdAt: new Date("2020-01-01") },
    });
    const newer = await bareUser("36000004");

    const { users } = await (await GET()).json();

    expect(users.map((u: { id: string }) => u.id)).toEqual([newer.id, older.id]);
  });
});

describe("DELETE /api/admin/users/[id]", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("refuses an account that has a membership request", async () => {
    const user = await userWithMember();

    const res = await DELETE(...asDelete(user.id, { confirmPhone: user.phone }));

    expect(res.status).toBe(409);
    expect(await prisma.user.count()).toBe(1);
  });

  it("refuses without the typed phone", async () => {
    const user = await bareUser();

    const res = await DELETE(...asDelete(user.id, {}));

    expect(res.status).toBe(400);
    expect(await prisma.user.count()).toBe(1);
  });

  it("refuses when the typed phone is wrong", async () => {
    const user = await bareUser();

    const res = await DELETE(...asDelete(user.id, { confirmPhone: "99999999" }));

    expect(res.status).toBe(400);
    expect(await prisma.user.count()).toBe(1);
  });

  it("answers 404 for an account that does not exist", async () => {
    const res = await DELETE(...asDelete("missing", { confirmPhone: "36000001" }));

    expect(res.status).toBe(404);
  });

  it("deletes and keeps a restorable copy when the phone matches", async () => {
    const user = await bareUser();

    const res = await DELETE(...asDelete(user.id, { confirmPhone: user.phone }));

    expect(res.status).toBe(200);
    expect(await prisma.user.count()).toBe(0);
    const record = await prisma.deletedRecord.findFirstOrThrow();
    expect(record).toMatchObject({ kind: "User", recordId: user.id, label: user.phone });
  });

  it("brings the account back on restore, password included", async () => {
    const user = await bareUser();
    await DELETE(...asDelete(user.id, { confirmPhone: user.phone }));
    const record = await prisma.deletedRecord.findFirstOrThrow();

    const res = await RESTORE(
      post(`/api/admin/deleted/${record.id}/restore`, {}),
      withId(record.id),
    );

    expect(res.status).toBe(200);
    const restored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(restored.phone).toBe(user.phone);
    expect(restored.password).toBe(user.password);
    expect(await prisma.deletedRecord.count()).toBe(0);
  });

  it("refuses to restore over a re-registered phone", async () => {
    const user = await bareUser();
    await DELETE(...asDelete(user.id, { confirmPhone: user.phone }));
    const record = await prisma.deletedRecord.findFirstOrThrow();
    await createUser(user.phone);

    const res = await RESTORE(
      post(`/api/admin/deleted/${record.id}/restore`, {}),
      withId(record.id),
    );

    expect(res.status).toBe(409);
    expect(await prisma.deletedRecord.count()).toBe(1);
  });
});
