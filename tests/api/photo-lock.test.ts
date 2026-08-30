import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { PATCH as ADMIN_PATCH } from "@/app/api/admin/members/[id]/route";
import { PATCH as SELF_PATCH } from "@/app/api/members/[id]/route";
import { GET as PROFILE } from "@/app/api/admin/members/[id]/profile/route";
import { GET as SELF_GET } from "@/app/api/members/[id]/route";
import {
  resetDb,
  get,
  patch,
  createAdmin,
  createUsers,
  signInAs,
  signInAsAdmin,
  withId,
  makeMember,
} from "./helpers";

async function member(person: Record<string, unknown> = {}) {
  const [user] = await createUsers(1);
  await prisma.user.update({
    where: { id: user.id },
    data: { fullName: "عضو", age: "البدريين", photo: "old.webp", ...person },
  });
  const row = await makeMember({ userId: user.id, paymentMethod: "بنكيلي", status: "ACTIVE" });
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

describe("the screens that read the block back", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("tells the admin profile the member is blocked", async () => {
    const { member: row } = await member({ photoLocked: true });
    await signInAsAdmin(await createAdmin());

    const body = await (
      await PROFILE(get(`/api/admin/members/${row.id}/profile`), withId(row.id))
    ).json();

    expect(body.member.photoLocked).toBe(true);
  });

  it("tells the admin profile when the member is not blocked", async () => {
    const { member: row } = await member();
    await signInAsAdmin(await createAdmin());

    const body = await (
      await PROFILE(get(`/api/admin/members/${row.id}/profile`), withId(row.id))
    ).json();

    expect(body.member.photoLocked).toBe(false);
  });

  it("tells the member's own read the picture is blocked", async () => {
    const { user, member: row } = await member({ photoLocked: true });
    await signInAs(user);

    const body = await (await SELF_GET(get(`/api/members/${row.id}`), withId(row.id))).json();

    expect(body.photoLocked).toBe(true);
  });
});

describe("an admin removing the picture", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("clears it without asking for a replacement", async () => {
    const { user, member: row } = await member();

    const res = await ADMIN_PATCH(
      patch(`/api/admin/members/${row.id}`, { photo: null }),
      withId(row.id),
    );

    expect(res.status).toBe(200);
    expect((await accountOf(user.id)).photo).toBeNull();
  });

  it("leaves the block where it was", async () => {
    const { user, member: row } = await member({ photoLocked: true });

    await ADMIN_PATCH(patch(`/api/admin/members/${row.id}`, { photo: null }), withId(row.id));

    expect((await accountOf(user.id)).photoLocked).toBe(true);
  });

  it("records the removal under its own name in the trail", async () => {
    const { member: row } = await member();

    await ADMIN_PATCH(patch(`/api/admin/members/${row.id}`, { photo: null }), withId(row.id));

    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { action: "REMOVE_MEMBER_PHOTO", targetId: row.id },
    });
    expect(JSON.stringify(entry.before)).toContain("old.webp");
  });

  it("says nothing to the trail when there was no picture to remove", async () => {
    const { member: row } = await member({ photo: null });

    await ADMIN_PATCH(patch(`/api/admin/members/${row.id}`, { photo: null }), withId(row.id));

    expect(await prisma.auditLog.count({ where: { action: "REMOVE_MEMBER_PHOTO" } })).toBe(0);
  });

  it("keeps the removal out of the trail when the block cleared the picture", async () => {
    const { member: row } = await member();

    await lock(row.id, true);

    expect(await prisma.auditLog.count({ where: { action: "REMOVE_MEMBER_PHOTO" } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: "LOCK_MEMBER_PHOTO" } })).toBe(1);
  });
});
