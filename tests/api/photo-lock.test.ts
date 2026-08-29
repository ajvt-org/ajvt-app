import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { PATCH as ADMIN_PATCH } from "@/app/api/admin/members/[id]/route";
import { PATCH as SELF_PATCH } from "@/app/api/members/[id]/route";
import {
  resetDb,
  patch,
  createAdmin,
  createUsers,
  signInAs,
  signInAsAdmin,
  withId,
} from "./helpers";

async function member(person: Record<string, unknown> = {}) {
  const [user] = await createUsers(1);
  await prisma.user.update({
    where: { id: user.id },
    data: { fullName: "عضو", age: "البدريين", photo: "old.webp", ...person },
  });
  const row = await prisma.member.create({
    data: { userId: user.id, paymentMethod: "بنكيلي", status: "ACTIVE" },
  });
  return { user, member: row };
}

function accountOf(userId: string) {
  return prisma.user.findUniqueOrThrow({ where: { id: userId } });
}

function lock(id: string, photoLocked: boolean) {
  return ADMIN_PATCH(patch(`/api/admin/members/${id}`, { photoLocked }), withId(id));
}

function changePhoto(id: string, photo: string | null) {
  return SELF_PATCH(patch(`/api/members/${id}`, { photo }), withId(id));
}

describe("an admin blocking a member's picture", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("marks the account and clears the picture that was there", async () => {
    const { user, member: row } = await member();
    await signInAsAdmin(await createAdmin());

    expect((await lock(row.id, true)).status).toBe(200);

    const after = await accountOf(user.id);
    expect(after.photoLocked).toBe(true);
    expect(after.photo).toBeNull();
  });

  it("records the block in the audit trail", async () => {
    const { member: row } = await member();
    await signInAsAdmin(await createAdmin());

    await lock(row.id, true);

    const entry = await prisma.auditLog.findFirst({ where: { action: "LOCK_MEMBER_PHOTO" } });
    expect(entry?.targetId).toBe(row.id);
  });

  it("records lifting the block too", async () => {
    const { user, member: row } = await member({ photoLocked: true, photo: null });
    await signInAsAdmin(await createAdmin());

    await lock(row.id, false);

    expect((await accountOf(user.id)).photoLocked).toBe(false);
    expect(await prisma.auditLog.count({ where: { action: "UNLOCK_MEMBER_PHOTO" } })).toBe(1);
  });

  it("says nothing to the trail when the block was already set that way", async () => {
    const { member: row } = await member({ photoLocked: true });
    await signInAsAdmin(await createAdmin());

    await lock(row.id, true);

    expect(await prisma.auditLog.count({ where: { action: "LOCK_MEMBER_PHOTO" } })).toBe(0);
  });

  it("leaves the picture alone when the block is lifted", async () => {
    const { user, member: row } = await member({ photoLocked: true, photo: "kept.webp" });
    await signInAsAdmin(await createAdmin());

    await lock(row.id, false);

    expect((await accountOf(user.id)).photo).toBe("kept.webp");
  });

  it("still lets the admin set a picture on a blocked member", async () => {
    const { user, member: row } = await member({ photoLocked: true, photo: null });
    await signInAsAdmin(await createAdmin());

    const res = await ADMIN_PATCH(
      patch(`/api/admin/members/${row.id}`, { photo: "admin.webp" }),
      withId(row.id),
    );

    expect(res.status).toBe(200);
    const after = await accountOf(user.id);
    expect(after.photo).toBe("admin.webp");
    expect(after.photoLocked).toBe(true);
  });
});

describe("a blocked member changing their own picture", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is refused with the reason", async () => {
    const { user, member: row } = await member({ photoLocked: true });
    await signInAs(user);

    const res = await changePhoto(row.id, "new.webp");
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain("موقوف");
    expect((await accountOf(user.id)).photo).toBe("old.webp");
  });

  it("cannot clear the picture either", async () => {
    const { user, member: row } = await member({ photoLocked: true });
    await signInAs(user);

    expect((await changePhoto(row.id, null)).status).toBe(403);
  });

  it("may still change it while the block is off", async () => {
    const { user, member: row } = await member();
    await signInAs(user);

    expect((await changePhoto(row.id, "new.webp")).status).toBe(200);
    expect((await accountOf(user.id)).photo).toBe("new.webp");
  });

  it("hands the new picture back to the screen that asked", async () => {
    const { user, member: row } = await member();
    await signInAs(user);

    const body = await (await changePhoto(row.id, "new.webp")).json();

    expect(body.photo).toBe("new.webp");
    expect(body.photoLocked).toBe(false);
  });

  it("may still change what else it is allowed to change", async () => {
    const { user, member: row } = await member({ photoLocked: true });
    await signInAs(user);

    const res = await SELF_PATCH(
      patch(`/api/members/${row.id}`, { surplusAnonymous: true }),
      withId(row.id),
    );

    expect(res.status).toBe(200);
  });

  it("tells the member their picture is blocked when it reads them back", async () => {
    const { user, member: row } = await member({ photoLocked: true });
    await signInAs(user);

    const res = await SELF_PATCH(
      patch(`/api/members/${row.id}`, { surplusAnonymous: false }),
      withId(row.id),
    );

    expect((await res.json()).photoLocked).toBe(true);
  });
});
