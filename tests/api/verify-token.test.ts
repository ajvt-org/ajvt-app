import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { issueMembership } from "@/lib/member";
import { resetDb, post, createAdmin, signInAsAdmin, personFor, makeMember } from "./helpers";
import { POST as VALIDATE } from "@/app/api/admin/validate/route";

async function pendingMember(name: string) {
  return makeMember({
    fullName: name,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "PENDING",
  });
}

describe("membership verification", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("gives an approved member a token alongside their number", async () => {
    const admin = await createAdmin();
    await signInAsAdmin(admin);
    const member = await pendingMember("محمد");

    await VALIDATE(post("/api/admin/validate", { id: member.userId, action: "ACTIVE" }));

    const after = await personFor(member.id);
    expect(after.memberNumber).toBeTruthy();
    expect(after.verifyToken).toMatch(/^[0-9a-f]{32}$/);
  });

  it("gives two members unrelated tokens even though their numbers are consecutive", async () => {
    const admin = await createAdmin();
    await signInAsAdmin(admin);
    const first = await pendingMember("الأول");
    const second = await pendingMember("الثاني");

    await VALIDATE(post("/api/admin/validate", { id: first.userId, action: "ACTIVE" }));
    await VALIDATE(post("/api/admin/validate", { id: second.userId, action: "ACTIVE" }));

    const a = await personFor(first.id);
    const b = await personFor(second.id);

    // The numbers run in sequence, which is the whole reason the QR stopped
    // carrying them.
    expect(Number(b.memberNumber!.slice(-4))).toBe(Number(a.memberNumber!.slice(-4)) + 1);
    expect(b.verifyToken).not.toBe(a.verifyToken);
  });

  it("cannot be looked up by the member number the card prints", async () => {
    const issued = await issueMembership();
    await makeMember({
      fullName: "محمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      ...issued,
    });

    const byToken = await prisma.user.findUnique({ where: { verifyToken: issued.verifyToken } });
    const byNumberAsToken = await prisma.user.findUnique({
      where: { verifyToken: issued.memberNumber },
    });

    expect(byToken).not.toBeNull();
    expect(byNumberAsToken).toBeNull();
  });
});
