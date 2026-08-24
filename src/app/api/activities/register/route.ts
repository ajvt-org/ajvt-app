import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { activityRegisterSchema } from "./schema";
import { activities, members } from "@/lib/messages";

export const POST = withRoute("POST /api/activities/register", async (req: NextRequest) => {
  const session = await requireUser();
  const { activityId, memberId } = parse(activityRegisterSchema, await req.json());

  const [member, activity] = await Promise.all([
    prisma.member.findUnique({ where: { id: memberId } }),
    prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true, isOpen: true, isVolunteer: true, capacity: true },
    }),
  ]);
  if (!activity) throw new NotFoundError(activities.notFound);
  if (!activity.isOpen) throw new ConflictError(activities.registrationClosed);
  if (!member || member.userId !== session.userId) throw new NotFoundError(members.notFound);
  if (member.status !== "ACTIVE") throw new ForbiddenError(activities.membershipNotApproved);

  const status = activity.isVolunteer ? "ACTIVE" : "PENDING";

  await prisma.$transaction(
    async (tx) => {
      const existing = await tx.activityRegistration.findUnique({
        where: { memberId_activityId: { memberId, activityId } },
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
        where: { memberId_activityId: { memberId, activityId } },
        update: { status, rejectionReason: null },
        create: { memberId, activityId, status },
      });
    },
    { isolationLevel: "Serializable" },
  );

  return NextResponse.json({ ok: true });
});

export const DELETE = withRoute("DELETE /api/activities/register", async (req: NextRequest) => {
  const session = await requireUser();
  const { memberId, activityId } = parse(activityRegisterSchema, await req.json());

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member || member.userId !== session.userId) throw new NotFoundError(members.notFound);

  await prisma.activityRegistration.deleteMany({ where: { memberId, activityId } });

  return NextResponse.json({ ok: true });
});
