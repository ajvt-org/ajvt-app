import { describe, it, expect, beforeEach } from "vitest";
import { POST as SUBMIT } from "@/app/api/members/route";
import { GET as ME } from "@/app/api/user/me/route";
import { GET as ADMIN_MEMBERS } from "@/app/api/admin/members/route";
import { prisma } from "@/lib/prisma";
import { endMembership } from "@/lib/membershipEndingServer";
import { getAppSettings } from "@/lib/settingsServer";
import { getViewerAge } from "@/lib/viewerAge";
import { MEMBERSHIP_ENDING_REASONS } from "@/lib/texts";
import { members as messages } from "@/lib/messages";
import {
  resetDb,
  post,
  createUser,
  createAdmin,
  signInAs,
  signInAsAdmin,
  makeMember,
} from "./helpers";
import { clearCookies } from "./cookieJar";

const PAYMENT = {
  fullName: "محمد ولد أحمد",
  age: "البدريين",
  paymentMethod: "بنكيلي",
  paymentProof: "proof.webp",
  paidAmount: 1000,
};

async function endedMember(over: Record<string, unknown> = {}) {
  const { membershipYear } = await getAppSettings();
  const user = await createUser();
  const member = await makeMember({
    userId: user.id,
    fullName: "محمد ولد أحمد",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    membershipYear,
    ...over,
  });
  await endMembership(prisma, member.userId, membershipYear, {
    reason: MEMBERSHIP_ENDING_REASONS[0],
    by: "members-admin",
    at: new Date(),
  });
  return user;
}

describe("what an ended membership reads as", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses a fresh submission on the same membership", async () => {
    const user = await endedMember();
    await signInAs(user);

    const res = await SUBMIT(post("/api/members", { ...PAYMENT, id: user.id }));

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: messages.membershipEnded });
    const row = await prisma.membership.findFirstOrThrow({ where: { userId: user.id } });
    expect(row.status).toBe("ACTIVE");
    expect(row.endedAt).not.toBeNull();
  });

  it("issues no membership number to an account whose membership ended", async () => {
    const user = await endedMember();
    await signInAs(user);

    await ME();

    const account = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(account.memberNumber).toBeNull();
  });

  it("stops answering the viewer age once the membership ended", async () => {
    const user = await endedMember();
    await signInAs(user);

    expect(await getViewerAge()).toBeNull();
  });

  it("carries the ending on the admin members list so the count can drop it", async () => {
    const user = await endedMember();
    clearCookies();
    await signInAsAdmin(await createAdmin("members-admin", "MEMBERS"));

    const body = await (await ADMIN_MEMBERS()).json();

    expect(body.members).toHaveLength(1);
    expect(body.members[0].id).toBe(user.id);
    expect(body.members[0].endedAt).not.toBeNull();
  });
});
