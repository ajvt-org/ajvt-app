import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { OWNER_ROLE, SUPER_ROLE } from "@/lib/adminRoles";
import { resetDb, get, put, createUser, createAdmin, signInAsAdmin, withId } from "./helpers";

import { PUT as SET_PRIVACY } from "@/app/api/admin/members/[id]/support-privacy/route";
import { GET as PROFILE } from "@/app/api/admin/members/[id]/profile/route";
import { makeMember } from "./helpers";

const GIVER = "الكريم ولد الساتر";

async function giver() {
  const user = await createUser("44001122");
  await prisma.user.update({ where: { id: user.id }, data: { fullName: GIVER } });
  await makeMember({ userId: user.id, status: "ACTIVE", paymentMethod: "بنكيلي" });
  return user;
}

function setPrivacy(userId: string, confidential: boolean) {
  return SET_PRIVACY(
    put(`/api/admin/members/${userId}/support-privacy`, { confidential }),
    withId(userId),
  );
}

const profileOf = (userId: string) =>
  PROFILE(get(`/api/admin/members/${userId}/profile`), withId(userId));

describe("the checkbox that makes a supporter name confidential", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is set by the role that holds the promise", async () => {
    const person = await giver();
    await signInAsAdmin(await createAdmin("owner", OWNER_ROLE));

    const response = await setPrivacy(person.id, true);

    expect(response.status).toBe(200);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: person.id } });
    expect(saved.supportNameConfidential).toBe(true);
  });

  it("is cleared by the same role", async () => {
    const person = await giver();
    await signInAsAdmin(await createAdmin("owner", OWNER_ROLE));
    await setPrivacy(person.id, true);

    expect((await setPrivacy(person.id, false)).status).toBe(200);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: person.id } });
    expect(saved.supportNameConfidential).toBe(false);
  });

  it("is refused to a full access admin, both setting and clearing", async () => {
    const person = await giver();
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    expect((await setPrivacy(person.id, true)).status).toBe(403);
    expect((await setPrivacy(person.id, false)).status).toBe(403);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: person.id } });
    expect(saved.supportNameConfidential).toBe(false);
  });

  it("is refused to a narrower admin", async () => {
    const person = await giver();
    await signInAsAdmin(await createAdmin("nurse", "MEMBERS"));

    expect((await setPrivacy(person.id, true)).status).toBe(403);
  });

  it("says nothing about an account that is not there", async () => {
    await signInAsAdmin(await createAdmin("owner", OWNER_ROLE));

    expect((await setPrivacy("nobody", true)).status).toBe(404);
  });

  it("writes an entry that carries no name and points at the account", async () => {
    const person = await giver();
    await signInAsAdmin(await createAdmin("owner", OWNER_ROLE));

    await setPrivacy(person.id, true);

    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { action: "HIDE_SUPPORTER_NAME" },
    });
    expect(entry.targetLabel).toBeNull();
    expect(entry.targetId).toBe(person.id);
    expect(JSON.stringify(entry)).not.toContain(GIVER);
  });

  it("reports how many existing entries already name him, and changes none of them", async () => {
    const person = await giver();
    await prisma.auditLog.createMany({
      data: [
        { adminUsername: "boss", action: "UPDATE_DONATION", targetLabel: `${GIVER} — 5000` },
        { adminUsername: "boss", action: "APPROVE_DONATION", targetLabel: GIVER },
        { adminUsername: "boss", action: "UPDATE_MEMBER", targetLabel: "شخص آخر" },
      ],
    });
    await signInAsAdmin(await createAdmin("owner", OWNER_ROLE));

    const result = await (await setPrivacy(person.id, true)).json();

    expect(result.namedEntries).toBe(2);
    expect(await prisma.auditLog.count({ where: { targetLabel: { contains: GIVER } } })).toBe(2);
  });

  it("counts a name buried in a stored row, not only a label", async () => {
    const person = await giver();
    await prisma.auditLog.create({
      data: {
        adminUsername: "boss",
        action: "UPDATE_DONATION",
        targetLabel: "فاعل خير",
        before: { donorName: GIVER, amount: 5000 },
      },
    });
    await signInAsAdmin(await createAdmin("owner", OWNER_ROLE));

    const result = await (await setPrivacy(person.id, true)).json();

    expect(result.namedEntries).toBe(1);
  });

  it("shows the checkbox to the role holder and to nobody else", async () => {
    const person = await giver();

    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));
    const hidden = await (await profileOf(person.id)).json();
    expect(hidden.supportPrivacy).toBeNull();

    await signInAsAdmin(await createAdmin("owner", OWNER_ROLE));
    const shown = await (await profileOf(person.id)).json();
    expect(shown.supportPrivacy).toEqual({ confidential: false, namedEntries: 0 });
  });

  it("does not write a second entry when the box is already where it is asked to be", async () => {
    const person = await giver();
    await signInAsAdmin(await createAdmin("owner", OWNER_ROLE));

    await setPrivacy(person.id, true);
    await setPrivacy(person.id, true);

    expect(await prisma.auditLog.count({ where: { action: "HIDE_SUPPORTER_NAME" } })).toBe(1);
  });
});
