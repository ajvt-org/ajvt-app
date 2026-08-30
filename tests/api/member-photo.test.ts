import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { PATCH as SELF_PATCH } from "@/app/api/members/[id]/route";
import { resetDb, patch, createUsers, signInAs, withId, makeMember } from "./helpers";

async function member() {
  const [user] = await createUsers(1);
  await prisma.user.update({
    where: { id: user.id },
    data: { fullName: "عضو", age: "البدريين", photo: "old.webp" },
  });
  const row = await makeMember({ userId: user.id, paymentMethod: "بنكيلي", status: "ACTIVE" });
  return { user, member: row };
}

describe("a member changing their own picture", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("writes the new picture to the account that carries it", async () => {
    const { user, member: row } = await member();
    await signInAs(user);

    const res = await SELF_PATCH(
      patch(`/api/members/${row.id}`, { photo: "new.webp" }),
      withId(row.id),
    );

    expect(res.status).toBe(200);
    expect((await res.json()).photo).toBe("new.webp");
    const account = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(account.photo).toBe("new.webp");
  });

  it("clears the picture when asked for nothing", async () => {
    const { user, member: row } = await member();
    await signInAs(user);

    const res = await SELF_PATCH(patch(`/api/members/${row.id}`, { photo: null }), withId(row.id));

    expect(res.status).toBe(200);
    const account = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(account.photo).toBeNull();
  });

  it("leaves the picture alone on a patch that does not name it", async () => {
    const { user, member: row } = await member();
    await signInAs(user);

    await SELF_PATCH(patch(`/api/members/${row.id}`, { surplusAnonymous: true }), withId(row.id));

    const account = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(account.photo).toBe("old.webp");
  });

  it("is not open to another account's membership", async () => {
    const { member: row } = await member();
    const [stranger] = await createUsers(1);
    await signInAs(stranger);

    const res = await SELF_PATCH(
      patch(`/api/members/${row.id}`, { photo: "new.webp" }),
      withId(row.id),
    );

    expect(res.status).toBe(404);
  });
});
