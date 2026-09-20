import { prisma } from "./prisma";
import { formatActivityDates } from "./activityDates";
import { sortActivities } from "./activityOrder";
import { STANDING_MATCH_SELECT, matchStanding } from "./activityMatches";
import { joinableTeams } from "./registrationTeamServer";
import { playersMayBuildTeams } from "./teamBuilding";

export async function publicActivityRows() {
  const activities = await prisma.activity.findMany({
    where: { published: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      order: true,
      title: true,
      description: true,
      period: true,
      startsAt: true,
      endsAt: true,
      withTime: true,
      photo: true,
      capacity: true,
      isOpen: true,
      isTournament: true,
      isVolunteer: true,
      whatsappLink: true,
      minTeamSize: true,
      maxTeamSize: true,
      playersBuildTeams: true,
      _count: { select: { registrations: { where: { status: { not: "REJECTED" } } } } },
      matches: { select: STANDING_MATCH_SELECT },
      teams: { select: { id: true, name: true }, orderBy: { createdAt: "asc" } },
    },
  });

  const rows = activities.map((activity) => ({
    ...activity,
    ...matchStanding(activity.matches, activity.isTournament),
  }));

  return sortActivities(rows).map((activity) => ({
    id: activity.id,
    title: activity.title,
    description: activity.description,
    when: formatActivityDates(activity),
    startsAt: activity.startsAt,
    endsAt: activity.endsAt,
    photo: activity.photo,
    capacity: activity.capacity,
    isOpen: activity.isOpen,
    isTournament: activity.isTournament,
    isVolunteer: activity.isVolunteer,
    whatsappLink: activity.whatsappLink,
    registrantCount: activity._count.registrations,
    unplayedMatches: activity.unplayedMatches,
    awaitingStage: activity.awaitingStage,
    joinableTeams: joinableTeams(activity, activity.teams),
    playersBuildTeams: playersMayBuildTeams(activity),
  }));
}
