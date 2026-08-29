import { endsAt as quizEndsAt } from "@/lib/quizRound";

export const MAX_ENROLLMENTS = 10;

export type EnrollmentItem = {
  id: string;
  label: string;
  photo: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isVolunteer: boolean;
  kind: "activity" | "competition";
};

export type ActivityRegistration = {
  id: string;
  activity: {
    title: string;
    photo: string | null;
    startsAt: Date | null;
    endsAt: Date | null;
    isVolunteer: boolean;
  };
};

export type QuizParticipation = {
  id: string;
  competition: {
    name: string;
    startsAt: Date;
    roundCount: number;
    roundPeriodMinutes: number;
    roundWindowMinutes: number;
  };
};

function byStartDesc(a: EnrollmentItem, b: EnrollmentItem): number {
  if (!a.startsAt && !b.startsAt) return 0;
  if (!a.startsAt) return 1;
  if (!b.startsAt) return -1;
  return b.startsAt.getTime() - a.startsAt.getTime();
}

export function mapEnrollments(
  registrations: ActivityRegistration[],
  quizParticipations: QuizParticipation[],
): EnrollmentItem[] {
  const items: EnrollmentItem[] = [
    ...registrations.map((r) => ({
      id: r.id,
      label: r.activity.title,
      photo: r.activity.photo,
      startsAt: r.activity.startsAt,
      endsAt: r.activity.endsAt,
      isVolunteer: r.activity.isVolunteer,
      kind: "activity" as const,
    })),
    ...quizParticipations.map((p) => ({
      id: p.id,
      label: p.competition.name,
      photo: null,
      startsAt: p.competition.startsAt,
      endsAt: quizEndsAt(p.competition),
      isVolunteer: false,
      kind: "competition" as const,
    })),
  ];

  return items.sort(byStartDesc).slice(0, MAX_ENROLLMENTS);
}
