import { prisma } from "@/lib/prisma";
import { MAX_ENROLLMENTS, mapEnrollments, type EnrollmentItem } from "@/lib/verifyEnrollments";

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
      members: {
        select: {
          status: true,
          createdAt: true,
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
                },
              },
            },
            orderBy: { activity: { startsAt: { sort: "desc", nulls: "last" } } },
            take: MAX_ENROLLMENTS,
          },
        },
        take: 1,
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

  const member = person?.members[0];
  if (!person || !member || member.status !== "ACTIVE") return null;

  return {
    fullName: person.fullName,
    age: person.age,
    village: person.village,
    memberNumber: person.memberNumber,
    photo: person.photo,
    memberSince: member.createdAt,
    enrollments: mapEnrollments(member.registrations, person.quizParticipations),
  };
}
