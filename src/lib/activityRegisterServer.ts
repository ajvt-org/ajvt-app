import { prisma } from "./prisma";
import { ConflictError, ForbiddenError, NotFoundError } from "./errors";
import { activities, members } from "./messages";
import { seatRegistrant, unseatRegistrant } from "./registrationTeamServer";
import { getAppSettings } from "./settingsServer";
import { membershipState } from "./membershipState";
import { asMembershipState } from "./currentMembership";
import { currentMembership } from "./currentMembershipServer";

async function refuseUnlessInGoodStanding(userId: string) {
  const [membership, { membershipYear }] = await Promise.all([
    currentMembership(prisma, userId),
    getAppSettings(),
  ]);
  if (!membership) throw new NotFoundError(members.notFound);
  if (membership.status !== "ACTIVE") {
    throw new ForbiddenError(activities.membershipNotApproved);
  }
  const standing = membershipState(asMembershipState(membership), membershipYear);
  if (standing === "ENDED") throw new ForbiddenError(activities.membershipEnded);
  if (standing === "BEHIND") throw new ForbiddenError(activities.membershipBehind);
}

export async function registerToActivity(activityId: string, userId: string, recordedBy: string) {
  const [account, activity] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true } }),
    prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        title: true,
        capacity: true,
        _count: { select: { registrations: { where: { status: { not: "REJECTED" } } } } },
      },
    }),
  ]);
  if (!account) throw new NotFoundError(members.notFound);
  if (!activity) throw new NotFoundError(activities.notFound);

  await refuseUnlessInGoodStanding(account.id);

  if (activity.capacity !== null && activity._count.registrations >= activity.capacity) {
    const already = await prisma.activityRegistration.findUnique({
      where: { userId_activityId: { userId: account.id, activityId } },
    });
    if (!already) throw new ConflictError(activities.capacityReached);
  }

  const registration = await prisma.$transaction(async (tx) => {
    const row = await tx.activityRegistration.upsert({
      where: { userId_activityId: { userId: account.id, activityId } },
      update: { status: "ACTIVE", rejectionReason: null, source: "ADMIN", recordedBy },
      create: { userId: account.id, activityId, status: "ACTIVE", source: "ADMIN", recordedBy },
    });
    await seatRegistrant(tx, row.id);
    return row;
  });

  return { registration, account, activity };
}

export interface RegistrationReview {
  registrationId: string;
  status: "ACTIVE" | "REJECTED";
  reason?: string | null;
}

export async function reviewRegistration(activityId: string, review: RegistrationReview) {
  const before = await prisma.activityRegistration.findUnique({
    where: { id: review.registrationId },
    select: {
      activityId: true,
      status: true,
      rejectionReason: true,
      userId: true,
      user: { select: { fullName: true } },
      activity: { select: { title: true } },
    },
  });
  if (!before || before.activityId !== activityId) {
    throw new NotFoundError(activities.registrationNotFound);
  }

  const { updated, kept } = await prisma.$transaction(async (tx) => {
    const row = await tx.activityRegistration.update({
      where: { id: review.registrationId },
      data: {
        status: review.status,
        rejectionReason: review.status === "REJECTED" ? review.reason?.trim() || null : null,
      },
    });
    if (review.status === "ACTIVE") {
      await seatRegistrant(tx, review.registrationId);
      return { updated: row, kept: 0 };
    }
    const released = await unseatRegistrant(tx, before.activityId, before.userId);
    return { updated: row, kept: released.kept };
  });

  return { updated, kept, before };
}

export async function removeRegistration(activityId: string, userId: string) {
  const existing = await prisma.activityRegistration.findFirst({
    where: { userId, activityId },
    select: {
      id: true,
      status: true,
      user: { select: { fullName: true } },
      activity: { select: { title: true } },
    },
  });
  if (!existing) return { existing: null, released: null };

  const released = await prisma.$transaction(async (tx) => {
    await tx.activityRegistration.delete({ where: { id: existing.id } });
    return unseatRegistrant(tx, activityId, userId);
  });

  return { existing, released };
}
