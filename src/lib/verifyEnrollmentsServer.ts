import { prisma } from "@/lib/prisma";
import { STANDING_MATCH_SELECT } from "@/lib/activityMatches";
import { MAX_ENROLLMENTS, mapEnrollments, type EnrollmentItem } from "@/lib/verifyEnrollments";
import { latestMembership } from "@/lib/currentMembership";

export type VerifiedMember = {
  fullName: string | null;
  age: string | null;
  village: string;
  memberNumber: string | null;
  photo: string | null;
  memberSince: Date;
  enrollments: EnrollmentItem[];
};

export async function loadVerifiedMember(token: string): Promise<VerifiedMember | null> {
  const person = await prisma.user.findUnique({
    where: { verifyToken: token },
    select: {
      fullName: true,
      age: true,
      village: true,
      memberNumber: true,
      photo: true,
      memberships: { select: { year: true, status: true, createdAt: true } },
      registrations: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          activity: {
            select: {
              title: true,
              photo: true,
              startsAt: true,
              endsAt: true,
              isVolunteer: true,
              isTournament: true,
              matches: { select: STANDING_MATCH_SELECT },
            },
          },
        },
        orderBy: { activity: { startsAt: { sort: "desc", nulls: "last" } } },
        take: MAX_ENROLLMENTS,
      },
      quizParticipations: {
        select: {
          id: true,
          competition: {
            select: {
              name: true,
              startsAt: true,
              roundCount: true,
              roundPeriodMinutes: true,
              roundWindowMinutes: true,
            },
          },
        },
        orderBy: { competition: { startsAt: "desc" } },
        take: MAX_ENROLLMENTS,
      },
    },
  });

  const current = person ? latestMembership(person.memberships) : null;
  const joined = person?.memberships.reduce<Date | null>(
    (first, m) => (first === null || m.createdAt < first ? m.createdAt : first),
    null,
  );
  if (!person || !joined || current?.status !== "ACTIVE") return null;

  return {
    fullName: person.fullName,
    age: person.age,
    village: person.village,
    memberNumber: person.memberNumber,
    photo: person.photo,
    memberSince: joined,
    enrollments: mapEnrollments(person.registrations, person.quizParticipations),
  };
}
