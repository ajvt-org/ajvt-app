import { describe, it, expect, beforeEach } from "vitest";
import * as bcrypt from "bcryptjs";
import { POST } from "@/app/api/admin/people/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createAdmin, createUser, signInAsAdmin } from "./helpers";

const PERSON = {
  accountPhone: "36000123",
  fullName: "محمد ولد أحمد",
  age: "البدريين",
  village: "التاكلالت",
};

async function asMembersAdmin() {
  await signInAsAdmin(await createAdmin("members-admin", "MEMBERS"));
}

describe("POST /api/admin/people", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an anonymous caller", async () => {
    expect((await POST(post("/api/admin/people", PERSON))).status).toBe(401);
    expect(await prisma.user.count()).toBe(0);
  });

  it("refuses an admin scoped to another section", async () => {
    await signInAsAdmin(await createAdmin("activities-admin", "ACTIVITIES"));

    expect((await POST(post("/api/admin/people", PERSON))).status).toBe(403);
  });

  it("creates the person and nothing about money", async () => {
    await asMembersAdmin();

    const res = await POST(post("/api/admin/people", PERSON));

    expect(res.status).toBe(201);
    const person = await prisma.user.findFirstOrThrow({ where: { phone: "36000123" } });
    expect(person).toMatchObject({
      fullName: "محمد ولد أحمد",
      age: "البدريين",
      village: "التاكلالت",
    });
    expect(await prisma.member.count()).toBe(0);
  });

  it("hands back a temporary password that actually signs in", async () => {
    await asMembersAdmin();

    const { tempPassword } = await (await POST(post("/api/admin/people", PERSON))).json();

    const person = await prisma.user.findFirstOrThrow({ where: { phone: "36000123" } });
    expect(await bcrypt.compare(tempPassword, person.password as string)).toBe(true);
  });

  it("creates someone with no number and no password to sign in with", async () => {
    await asMembersAdmin();

    const res = await POST(
      post("/api/admin/people", { ...PERSON, accountPhone: null, phoneUnknown: true }),
    );

    expect(res.status).toBe(201);
    const person = await prisma.user.findFirstOrThrow({ where: { fullName: "محمد ولد أحمد" } });
    expect(person.phone).toBeNull();
    expect(person.password).toBeNull();
    expect((await res.json()).tempPassword).toBeUndefined();
  });

  it("refuses a number that already belongs to someone", async () => {
    await createUser("36000123");
    await asMembersAdmin();

    const res = await POST(post("/api/admin/people", PERSON));

    expect(res.status).toBe(409);
    expect(await prisma.user.count({ where: { phone: "36000123" } })).toBe(1);
  });

  it("demands a real number unless the admin says there is none", async () => {
    await asMembersAdmin();

    expect((await POST(post("/api/admin/people", { ...PERSON, accountPhone: "12" }))).status).toBe(
      400,
    );
    expect(await prisma.user.count()).toBe(0);
  });

  it("demands an age group for the home village and not for a neighbour", async () => {
    await asMembersAdmin();
    await prisma.village.create({ data: { name: "أفجار" } });

    const missing = await POST(post("/api/admin/people", { ...PERSON, age: null }));
    expect(missing.status).toBe(400);

    const neighbour = await POST(
      post("/api/admin/people", {
        ...PERSON,
        accountPhone: "36000124",
        village: "أفجار",
        age: null,
      }),
    );
    expect(neighbour.status).toBe(201);
    const person = await prisma.user.findFirstOrThrow({ where: { phone: "36000124" } });
    expect(person.age).toBeNull();
    expect(person.village).toBe("أفجار");
  });

  it("refuses a village nobody has heard of", async () => {
    await asMembersAdmin();

    const res = await POST(post("/api/admin/people", { ...PERSON, village: "قرية مخترعة" }));

    expect(res.status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });

  it("writes the person into the audit log", async () => {
    await asMembersAdmin();

    await POST(post("/api/admin/people", PERSON));

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "CREATE_PERSON" } });
    expect(entry.targetLabel).toBe("محمد ولد أحمد");
  });
});
