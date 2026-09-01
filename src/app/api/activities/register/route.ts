import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { activityRegisterSchema } from "./schema";
import { activities, members } from "@/lib/messages";
import { getAppSettings } from "@/lib/settingsServer";
import { membershipState } from "@/lib/membershipState";
import { asMembershipState } from "@/lib/currentMembership";
import { currentMembership } from "@/lib/currentMembershipServer";

export const POST = withRoute("POST /api/activities/register", async (req: NextRequest) => {
  const session = await requireUser();
  const { activityId, userId } = parse(activityRegisterSchema, await req.json());

  const [membership, activity] = await Promise.all([
    userId === session.userId ? currentMembership(prisma, userId) : null,
    prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        isOpen: true,
        isVolunteer: true,
        autoApprove: true,
        capacity: true,
      },
    }),
  ]);
  if (!activity) throw new NotFoundError(activities.notFound);
  if (!activity.isOpen) throw new ConflictError(activities.registrationClosed);
  if (!membership) throw new NotFoundError(members.notFound);
  if (membership.status !== "ACTIVE") throw new ForbiddenError(activities.membershipNotApproved);

  const { membershipYear } = await getAppSettings();
  if (membershipState(asMembershipState(membership), membershipYear) === "BEHIND") {
    throw new ForbiddenError(activities.membershipBehind);
  }

  const status = activity.isVolunteer || activity.autoApprove ? "ACTIVE" : "PENDING";

  await prisma.$transaction(
    async (tx) => {
      const existing = await tx.activityRegistration.findUnique({
        where: { userId_activityId: { userId: session.userId, activityId } },
        select: { status: true },
      });
      if (existing && existing.status !== "REJECTED") {
        throw new ConflictError(activities.alreadyRegistered);
      }
      if (activity.capacity !== null) {
        const taken = await tx.activityRegistration.count({
          where: { activityId, status: { not: "REJECTED" } },
        });
        if (taken >= activity.capacity) throw new ConflictError(activities.noSeatsLeft);
      }
      await tx.activityRegistration.upsert({
        where: { userId_activityId: { userId: session.userId, activityId } },
        update: { status, rejectionReason: null },
        create: { userId: session.userId, activityId, status },
      });
    },
    { isolationLevel: "Serializable" },
  );

  return NextResponse.json({ ok: true });
});

export const DELETE = withRoute("DELETE /api/activities/register", async (req: NextRequest) => {
  const session = await requireUser();
  const { userId, activityId } = parse(activityRegisterSchema, await req.json());

  if (userId !== session.userId) throw new NotFoundError(members.notFound);

  await prisma.activityRegistration.deleteMany({ where: { userId: session.userId, activityId } });

  return NextResponse.json({ ok: true });
});
