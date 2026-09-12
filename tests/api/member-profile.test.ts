import { describe, it, expect, beforeEach } from "vitest";
import { GET as PROFILE } from "@/app/api/admin/members/[id]/profile/route";
import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { runningYear } from "@/lib/membershipYear";
import { resetDb, get, createAdmin, signInAsAdmin, withId, makeMember } from "./helpers";

const YEAR = runningYear();

function ask(id: string) {
  return [get(`/api/admin/members/${id}/profile`), withId(id)] as const;
}

async function aMember(fullName = "محمد") {
  return makeMember({
    fullName,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
  });
}

describe("a member's whole file, in one answer", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an anonymous caller", async () => {
    const member = await aMember();

    expect((await PROFILE(...ask(member.userId))).status).toBe(401);
  });

  it("says not found for an id that is not a member", async () => {
    await signInAsAdmin(await createAdmin());

    expect((await PROFILE(...ask("nope"))).status).toBe(404);
  });

  it("brings the activities, the teams and the donations together", async () => {
    await signInAsAdmin(await createAdmin());
    const member = await aMember();
    const activity = await prisma.activity.create({
      data: { title: "دوري", description: "d", isTournament: true },
    });
    await prisma.activityRegistration.create({
      data: {
        userId: member.userId,
        activityId: activity.id,
        status: "ACTIVE",
      },
    });
    const team = await prisma.team.create({ data: { activityId: activity.id, name: "النجم" } });
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: member.userId, status: "ACTIVE" },
    });
    await prisma.payment.create({
      data: {
        purpose: "DONATION",
        amount: 500,
        userId: member.userId,
        status: "ACTIVE",
        source: "SELF",
      },
    });

    const body = await (await PROFILE(...ask(member.userId))).json();

    expect(body.member.registrations).toHaveLength(1);
    expect(body.member.teamMemberships[0].team.name).toBe("النجم");
    expect(body.member.donations[0].amount).toBe(500);
  });

  it("lists the money a member paid above the fee, showing the surplus and not the whole payment", async () => {
    await signInAsAdmin(await createAdmin());
    const member = await makeMember({
      fullName: "محمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      membershipYear: YEAR,
      paidAmount: MEMBERSHIP_FEE + 4000,
    });

    const body = await (await PROFILE(...ask(member.userId))).json();

    expect(body.member.donations).toHaveLength(1);
    expect(body.member.donations[0].amount).toBe(4000);
    expect(body.member.donations[0].source).toBe("MEMBERSHIP");
    expect(body.member.supportAmount).toBe(4000);
  });

  it("lists no gift for a member who paid the fee and nothing more", async () => {
    await signInAsAdmin(await createAdmin());
    const member = await makeMember({
      fullName: "أحمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      membershipYear: YEAR,
      paidAmount: MEMBERSHIP_FEE,
    });

    const body = await (await PROFILE(...ask(member.userId))).json();

    expect(body.member.donations).toEqual([]);
    expect(body.member.paidAmount).toBe(MEMBERSHIP_FEE);
  });

  it("says a gift arrived unrecorded rather than leaving the arrival empty", async () => {
    await signInAsAdmin(await createAdmin());
    const member = await aMember();
    await prisma.payment.create({
      data: { purpose: "DONATION", amount: 900, userId: member.userId, status: "ACTIVE" },
    });

    const body = await (await PROFILE(...ask(member.userId))).json();

    expect(body.member.donations[0].source).toBe("UNRECORDED");
  });

  it("carries only this member's own history", async () => {
    await signInAsAdmin(await createAdmin());
    const mine = await aMember("محمد");
    const other = await aMember("أحمد");
    await prisma.auditLog.create({
      data: {
        adminUsername: "admin",
        action: "APPROVE_MEMBER",
        targetType: "Member",
        targetId: mine.userId,
      },
    });
    await prisma.auditLog.create({
      data: {
        adminUsername: "admin",
        action: "REJECT_MEMBER",
        targetType: "Member",
        targetId: other.userId,
      },
    });

    const body = await (await PROFILE(...ask(mine.userId))).json();

    expect(body.history).toHaveLength(1);
    expect(body.history[0].action).toBe("APPROVE_MEMBER");
  });
});
