import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { activities, entrantWording, tournament } from "./messages";
import { entrantOf, entrantOfActivity } from "./entrantServer";
import { anySideIs } from "./matchSides";
import { captainIsOnTheRoster } from "./teamCaptainServer";
import { nameOf } from "./person";
import { placeholderTeamName, squadIsSet, squadOf } from "./squadSize";
import { trimmed } from "./activityFields";

const NAME_MAX = 40;

export interface NewTeam {
  name?: unknown;
  groupId?: unknown;
  logo?: unknown;
}

export async function listActivityTeams(id: string) {
  const teams = await prisma.team.findMany({
    where: { activityId: id },
    orderBy: { createdAt: "asc" },
    include: {
      group: { select: { id: true, name: true } },
      members: {
        select: {
          id: true,
          status: true,
          invitedByCaptain: true,
          userId: true,
          user: {
            select: { phone: true, fullName: true, age: true, village: true, photo: true },
          },
        },
      },
    },
  });

  return teams.map((team) => ({
    ...team,
    members: team.members.map(({ user, ...member }) => ({
      ...member,
      member: {
        id: member.userId,
        fullName: nameOf(user),
        phone: user.phone ?? "",
        age: user.age ?? "",
        village: user.village,
        photo: user.photo,
      },
    })),
  }));
}

export async function createActivityTeam(id: string, input: NewTeam) {
  const activity = await prisma.activity.findUnique({
    where: { id },
    select: { isTournament: true, minTeamSize: true, maxTeamSize: true },
  });
  if (!activity?.isTournament) throw new ValidationError(activities.notATournament);

  const words = entrantWording(entrantOf(activity));
  const name = trimmed(input.name);

  if (name && name.length > NAME_MAX) throw new ValidationError(words.entrantNameTooLong);
  if (!name && !squadIsSet(squadOf(activity))) {
    throw new ValidationError(words.entrantNameRequired);
  }

  const groupId = typeof input.groupId === "string" && input.groupId ? input.groupId : null;
  if (groupId) {
    const group = await prisma.group.findFirst({ where: { id: groupId, activityId: id } });
    if (!group) throw new ValidationError(tournament.groupNotFound);
  }

  const teamCount = await prisma.team.count({ where: { activityId: id } });

  return prisma.team.create({
    data: {
      activityId: id,
      name: name || placeholderTeamName(teamCount + 1),
      autoNamed: !name,
      groupId,
      logo: (typeof input.logo === "string" && input.logo) || null,
    },
  });
}

export interface TeamEdit {
  name?: unknown;
  groupId?: unknown;
  logo?: unknown;
  captainUserId?: unknown;
  fromHomeVillage?: unknown;
  disabled?: unknown;
}

interface TeamData {
  name?: string;
  groupId?: string | null;
  logo?: string | null;
  captainUserId?: string | null;
  fromHomeVillage?: boolean;
  disabledAt?: Date | null;
}

export async function updateTeam(teamId: string, input: TeamEdit) {
  const existing = await prisma.team.findUnique({ where: { id: teamId } });
  if (!existing) throw new NotFoundError(tournament.teamNotFound);

  const words = entrantWording(await entrantOfActivity(prisma, existing.activityId));
  const data: TeamData = {};

  if (input.name !== undefined) {
    const name = trimmed(input.name);
    if (!name) throw new ValidationError(words.entrantNameRequired);
    if (name.length > NAME_MAX) throw new ValidationError(words.entrantNameTooLong);
    data.name = name;
  }
  if (input.groupId !== undefined) {
    const groupId = (typeof input.groupId === "string" && input.groupId) || null;
    if (groupId) {
      const group = await prisma.group.findFirst({
        where: { id: groupId, activityId: existing.activityId },
      });
      if (!group) throw new ValidationError(tournament.groupNotFound);
    }
    if (groupId !== existing.groupId) {
      const fixture = await prisma.match.findFirst({
        where: { activityId: existing.activityId, ...anySideIs([teamId]) },
        select: { id: true },
      });
      if (fixture) throw new ConflictError(tournament.groupLockedByMatches);
    }
    data.groupId = groupId;
  }
  if (input.logo !== undefined) {
    data.logo = (typeof input.logo === "string" && input.logo) || null;
  }
  if (input.captainUserId !== undefined) {
    const captain = (typeof input.captainUserId === "string" && input.captainUserId) || null;
    if (captain && !(await captainIsOnTheRoster(prisma, teamId, captain))) {
      throw new ValidationError(words.captainNotInEntrant);
    }
    data.captainUserId = captain;
  }
  if (input.fromHomeVillage !== undefined) data.fromHomeVillage = !!input.fromHomeVillage;
  if (input.disabled !== undefined) {
    data.disabledAt = input.disabled ? (existing.disabledAt ?? new Date()) : null;
  }

  const team = await prisma.team.update({ where: { id: teamId }, data });
  return { team, existing };
}

export async function removeTeam(teamId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new NotFoundError(tournament.teamNotFound);

  await prisma.team.delete({ where: { id: teamId } });
  return team;
}
