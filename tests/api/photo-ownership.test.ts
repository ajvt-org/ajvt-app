import { describe, it, expect, beforeEach } from "vitest";
import { POST as CREATE_PERSON } from "@/app/api/admin/people/route";
import { PATCH as ADMIN_PATCH } from "@/app/api/admin/members/[id]/route";
import { prisma } from "@/lib/prisma";
import { uploads } from "@/lib/messages";
import {
  resetDb,
  patch,
  post,
  createAdmin,
  createUsers,
  makeMember,
  signInAsAdmin,
  uploadedBy,
  withId,
} from "./helpers";

const PERSON = {
  accountPhone: "36000123",
  fullName: "محمد ولد أحمد",
  age: "البدريين",
  village: "التاكلالت",
};

async function membersAdmin(username = "members-admin") {
  const admin = await createAdmin(username, "MEMBERS");
  await signInAsAdmin(admin);
  return admin;
}

async function memberRow() {
  const [user] = await createUsers(1);
  await prisma.user.update({ where: { id: user.id }, data: { photo: "old.webp" } });
  await makeMember({ userId: user.id, paymentMethod: "بنكيلي", status: "ACTIVE" });
  return user;
}

describe("an admin naming a picture for a new person", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("takes the picture that admin uploaded", async () => {
    const admin = await membersAdmin();
    await uploadedBy("mine.webp", { adminId: admin.id });

    const res = await CREATE_PERSON(post("/api/admin/people", { ...PERSON, photo: "mine.webp" }));

    expect(res.status).toBe(201);
    expect((await prisma.user.findFirstOrThrow()).photo).toBe("mine.webp");
  });

  it("refuses a picture another admin uploaded", async () => {
    const other = await createAdmin("other-admin", "MEMBERS");
    await uploadedBy("theirs.webp", { adminId: other.id });
    await membersAdmin();

    const res = await CREATE_PERSON(post("/api/admin/people", { ...PERSON, photo: "theirs.webp" }));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(uploads.notYourUpload);
    expect(await prisma.user.count()).toBe(0);
  });

  it("refuses a picture a member uploaded", async () => {
    const [member] = await createUsers(1);
    await uploadedBy("member.webp", { userId: member.id });
    await membersAdmin();

    const res = await CREATE_PERSON(post("/api/admin/people", { ...PERSON, photo: "member.webp" }));

    expect(res.status).toBe(400);
  });
});

describe("an admin changing a member's picture", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("takes the picture that admin uploaded", async () => {
    const user = await memberRow();
    const admin = await membersAdmin();
    await uploadedBy("mine.webp", { adminId: admin.id });

    const res = await ADMIN_PATCH(
      patch(`/api/admin/members/${user.id}`, { photo: "mine.webp" }),
      withId(user.id),
    );

    expect(res.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).photo).toBe(
      "mine.webp",
    );
  });

  it("refuses a filename with no upload behind it and keeps what was there", async () => {
    const user = await memberRow();
    await membersAdmin();

    const res = await ADMIN_PATCH(
      patch(`/api/admin/members/${user.id}`, { photo: "nowhere.webp" }),
      withId(user.id),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(uploads.notYourUpload);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).photo).toBe(
      "old.webp",
    );
  });

  it("still clears a picture, since nothing is being named", async () => {
    const user = await memberRow();
    await membersAdmin();

    const res = await ADMIN_PATCH(
      patch(`/api/admin/members/${user.id}`, { photo: null }),
      withId(user.id),
    );

    expect(res.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).photo).toBeNull();
  });

  it("leaves a picture set before this rule alone", async () => {
    const user = await memberRow();
    await membersAdmin();

    const res = await ADMIN_PATCH(
      patch(`/api/admin/members/${user.id}`, { fullName: "اسم آخر" }),
      withId(user.id),
    );

    expect(res.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).photo).toBe(
      "old.webp",
    );
  });
});

describe("an admin saving a member without touching the picture", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("saves a picture another admin uploaded, sent back unchanged", async () => {
    const user = await memberRow();
    const other = await createAdmin("other-admin", "MEMBERS");
    await uploadedBy("old.webp", { adminId: other.id });
    await membersAdmin();

    const res = await ADMIN_PATCH(
      patch(`/api/admin/members/${user.id}`, { fullName: "اسم آخر", photo: "old.webp" }),
      withId(user.id),
    );

    expect(res.status).toBe(200);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.photo).toBe("old.webp");
    expect(saved.fullName).toBe("اسم آخر");
  });

  it("saves a picture with no upload record behind it, sent back unchanged", async () => {
    const user = await memberRow();
    await membersAdmin();

    const res = await ADMIN_PATCH(
      patch(`/api/admin/members/${user.id}`, { village: "التاكلالت", photo: "old.webp" }),
      withId(user.id),
    );

    expect(res.status).toBe(200);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.photo).toBe("old.webp");
    expect(saved.village).toBe("التاكلالت");
  });

  it("still refuses a different filename the admin does not own", async () => {
    const user = await memberRow();
    const other = await createAdmin("other-admin", "MEMBERS");
    await uploadedBy("theirs.webp", { adminId: other.id });
    await membersAdmin();

    const res = await ADMIN_PATCH(
      patch(`/api/admin/members/${user.id}`, { photo: "theirs.webp" }),
      withId(user.id),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(uploads.notYourUpload);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).photo).toBe(
      "old.webp",
    );
  });

  it("takes a different filename the admin does own", async () => {
    const user = await memberRow();
    const admin = await membersAdmin();
    await uploadedBy("mine.webp", { adminId: admin.id });

    const res = await ADMIN_PATCH(
      patch(`/api/admin/members/${user.id}`, { photo: "mine.webp" }),
      withId(user.id),
    );

    expect(res.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).photo).toBe(
      "mine.webp",
    );
  });
});
