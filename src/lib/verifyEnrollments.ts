import { endsAt as quizEndsAt } from "@/lib/quizRound";
import { matchStanding, type StandingMatch } from "@/lib/activityMatches";
import type { TournamentStage } from "@/lib/tournamentStage";

export const MAX_ENROLLMENTS = 10;

export type EnrollmentItem = {
  id: string;
  label: string;
  photo: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isVolunteer: boolean;
  unplayedMatches?: number;
  awaitingStage?: TournamentStage | null;
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
    isTournament: boolean;
    matches: StandingMatch[];
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
      ...matchStanding(r.activity.matches, r.activity.isTournament),
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
