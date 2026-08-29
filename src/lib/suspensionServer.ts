import { prisma } from "./prisma";
import type { Prisma, SuspensionReason, SuspensionScope } from "@prisma/client";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { tournament as messages } from "./messages";
import { nameOf } from "./person";
import { accountOf } from "./memberAccount";

type Tx = Prisma.TransactionClient;

const SYSTEM = "النظام";

export function suspensionIsRunning(
  s: { status: string; scope: string; matches: number | null; until: Date | null },
  now = new Date(),
): boolean {
  if (s.status !== "ACTIVE") return false;
  if (s.scope === "INDEFINITE") return true;
  if (s.scope === "MATCHES") return (s.matches ?? 0) > 0;
  return s.until !== null && s.until > now;
}

export async function runningSuspensions(activityId: string, now = new Date()) {
  const rows = await prisma.suspension.findMany({
    where: { activityId, status: "ACTIVE" },
    select: {
      id: true,
      memberId: true,
      scope: true,
      matches: true,
      until: true,
      status: true,
      reason: true,
    },
  });
  return rows.filter((s) => suspensionIsRunning(s, now));
}

export async function suspendedMemberIds(activityId: string, now = new Date()) {
  return new Set((await runningSuspensions(activityId, now)).map((s) => s.memberId));
}

async function hasOpenSuspension(tx: Tx, activityId: string, userId: string) {
  const open = await tx.suspension.findFirst({
    where: { activityId, userId, status: { in: ["PROPOSED", "ACTIVE"] } },
    select: { id: true },
  });
  return open !== null;
}

export async function proposeFromBooking(
  tx: Tx,
  activityId: string,
  memberId: string,
  cardType: string,
) {
  const activity = await tx.activity.findUniqueOrThrow({
    where: { id: activityId },
    select: { yellowsForBan: true, redBanMatches: true },
  });

  const userId = await accountOf(tx, memberId);
  if (await hasOpenSuspension(tx, activityId, userId)) return null;

  if (cardType === "RED") {
    return tx.suspension.create({
      data: {
        activityId,
        memberId,
        userId,
        reason: "RED_CARD",
        scope: "MATCHES",
        matches: activity.redBanMatches,
        createdBy: SYSTEM,
      },
    });
  }

  const lastBan = await tx.suspension.findFirst({
    where: { activityId, userId, reason: "YELLOW_CARDS" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const yellows = await tx.matchBooking.count({
    where: {
      memberId,
      cardType: "YELLOW",
      match: { activityId },
      ...(lastBan ? { createdAt: { gt: lastBan.createdAt } } : {}),
    },
  });
  if (yellows >= activity.yellowsForBan) {
    return tx.suspension.create({
      data: {
        activityId,
        memberId,
        userId,
        reason: "YELLOW_CARDS",
        scope: "MATCHES",
        matches: 1,
        createdBy: SYSTEM,
      },
    });
  }
  return null;
}

export async function serveMatch(tx: Tx, activityId: string, teamIds: string[]) {
  const squadMembers = await tx.teamMember.findMany({
    where: { teamId: { in: teamIds } },
    select: { memberId: true },
  });
  const memberIds = squadMembers.map((m) => m.memberId);
  if (memberIds.length === 0) return;

  const running = await tx.suspension.findMany({
    where: {
      activityId,
      status: "ACTIVE",
      scope: "MATCHES",
      matches: { gt: 0 },
      memberId: { in: memberIds },
    },
    select: { id: true, matches: true },
  });
  for (const s of running) {
    const left = (s.matches ?? 1) - 1;
    await tx.suspension.update({
      where: { id: s.id },
      data: { matches: left, status: left === 0 ? "LIFTED" : "ACTIVE" },
    });
  }
}

export interface ManualSuspension {
  memberId: string;
  scope: SuspensionScope;
  matches: number | null;
  until: Date | null;
  note: string | null;
  reason?: SuspensionReason;
}

export async function proposeSuspension(
  activityId: string,
  input: ManualSuspension,
  createdBy: string,
) {
  if (input.scope === "MATCHES" && (!input.matches || input.matches < 1)) {
    throw new ValidationError(messages.suspensionMatchesRequired);
  }
  if (input.scope === "DAYS" && !input.until) {
    throw new ValidationError(messages.suspensionUntilRequired);
  }
  return prisma.$transaction(async (tx) => {
    const userId = await accountOf(tx, input.memberId);
    const member = await tx.teamMember.findFirst({
      where: { userId, team: { activityId } },
      select: { id: true },
    });
    if (!member) throw new NotFoundError(messages.memberNotInTournament);
    if (await hasOpenSuspension(tx, activityId, userId)) {
      throw new ConflictError(messages.suspensionAlreadyOpen);
    }
    return tx.suspension.create({
      data: {
        activityId,
        memberId: input.memberId,
        userId,
        reason: input.reason ?? "CONDUCT",
        scope: input.scope,
        matches: input.scope === "MATCHES" ? input.matches : null,
        until: input.scope === "DAYS" ? input.until : null,
        note: input.note,
        createdBy,
      },
    });
  });
}

export async function decideSuspension(
  activityId: string,
  suspensionId: string,
  approve: boolean,
  decidedBy: string,
) {
  const suspension = await prisma.suspension.findUnique({ where: { id: suspensionId } });
  if (!suspension || suspension.activityId !== activityId) {
    throw new NotFoundError(messages.suspensionNotFound);
  }
  if (suspension.status !== "PROPOSED") throw new ConflictError(messages.suspensionDecided);
  if (!approve) {
    await prisma.suspension.delete({ where: { id: suspensionId } });
    return null;
  }
  return prisma.suspension.update({
    where: { id: suspensionId },
    data: { status: "ACTIVE", decidedBy },
  });
}

export async function liftSuspension(activityId: string, suspensionId: string, decidedBy: string) {
  const suspension = await prisma.suspension.findUnique({ where: { id: suspensionId } });
  if (!suspension || suspension.activityId !== activityId) {
    throw new NotFoundError(messages.suspensionNotFound);
  }
  if (suspension.status !== "ACTIVE") throw new ConflictError(messages.suspensionNotActive);
  return prisma.suspension.update({
    where: { id: suspensionId },
    data: { status: "LIFTED", decidedBy },
  });
}

export async function listSuspensions(activityId: string) {
  const rows = await prisma.suspension.findMany({
    where: { activityId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      reason: true,
      scope: true,
      matches: true,
      until: true,
      note: true,
      status: true,
      createdBy: true,
      decidedBy: true,
      createdAt: true,
      memberId: true,
      user: { select: { fullName: true, photo: true } },
    },
  });
  const now = new Date();
  return rows.map((s) => ({
    ...s,
    member: { id: s.memberId, fullName: nameOf(s.user), photo: s.user.photo },
    running: suspensionIsRunning(s, now),
  }));
}
