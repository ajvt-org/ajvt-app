import { prisma } from "./prisma";
import { ValidationError } from "./errors";
import { activities, entrantWording, tournament } from "./messages";
import { entrantOf } from "./entrantServer";
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
