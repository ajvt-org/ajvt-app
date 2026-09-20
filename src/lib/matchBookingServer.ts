import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { tournament } from "./messages";
import { proposeFromBooking, suspendedUserIds } from "./suspensionServer";

const BOOKING_SELECT = {
  id: true,
  cardType: true,
  minute: true,
  teamId: true,
  userId: true,
  user: { select: { fullName: true } },
} as const;

export interface BookingInput {
  userId: string;
  teamId: string;
  cardType: string;
  minute?: number | null;
}

async function requireOnTheRoster(teamId: string, userId: string) {
  const seat = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (!seat) throw new ValidationError(tournament.playerNotInTeam);
}

export async function createBooking(matchId: string, input: BookingInput) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { homeTeamId: true, awayTeamId: true, activityId: true },
  });
  if (!match) throw new NotFoundError(tournament.matchNotFound);
  if (input.teamId !== match.homeTeamId && input.teamId !== match.awayTeamId) {
    throw new ValidationError(tournament.teamNotInMatch);
  }

  await requireOnTheRoster(input.teamId, input.userId);

  const suspended = await suspendedUserIds(match.activityId);
  if (suspended.has(input.userId)) throw new ConflictError(tournament.memberSuspended);

  return prisma.$transaction(async (tx) => {
    const booking = await tx.matchBooking.create({
      data: {
        matchId,
        userId: input.userId,
        teamId: input.teamId,
        cardType: input.cardType,
        minute: input.minute ?? null,
      },
      select: BOOKING_SELECT,
    });
    const proposal = await proposeFromBooking(tx, match.activityId, input.userId, input.cardType);
    return { booking, proposed: proposal !== null };
  });
}

export interface BookingEdit {
  userId?: string;
  teamId?: string;
  cardType?: string;
  minute?: number | null;
}

export async function updateBooking(bookingId: string, input: BookingEdit) {
  const before = await prisma.matchBooking.findUnique({
    where: { id: bookingId },
    select: {
      cardType: true,
      minute: true,
      userId: true,
      teamId: true,
      match: { select: { homeTeamId: true, awayTeamId: true } },
    },
  });
  if (!before) throw new NotFoundError(tournament.bookingNotFound);

  const teamId = input.teamId ?? before.teamId;
  const userId = input.userId ?? before.userId;
  if (teamId !== before.match.homeTeamId && teamId !== before.match.awayTeamId) {
    throw new ValidationError(tournament.teamNotInMatch);
  }

  await requireOnTheRoster(teamId, userId);

  const booking = await prisma.matchBooking.update({
    where: { id: bookingId },
    data: {
      userId,
      teamId,
      cardType: input.cardType ?? before.cardType,
      minute: input.minute === undefined ? before.minute : input.minute,
    },
    select: BOOKING_SELECT,
  });

  return { booking, before };
}

export async function removeBooking(bookingId: string) {
  const booking = await prisma.matchBooking.findUnique({
    where: { id: bookingId },
    select: {
      cardType: true,
      minute: true,
      matchId: true,
      teamId: true,
      userId: true,
      user: { select: { fullName: true } },
    },
  });
  if (!booking) return null;

  await prisma.matchBooking.delete({ where: { id: bookingId } });
  return booking;
}
