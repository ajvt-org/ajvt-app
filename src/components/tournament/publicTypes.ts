import type {
  PartRow,
  RecordedAdjustmentRow,
  SeriesStandingRow,
} from "@/components/admin/tournament/seriesTypes";

export type MatchTeam = { id: string; name: string; logo: string | null; photo?: string | null };

export type MatchPlayer = { id: string; fullName: string; photo: string | null };

export type MatchGoal = {
  count: number;
  minute: number | null;
  teamId: string;
  kind: "GOAL" | "PENALTY" | "OWN_GOAL";
  period: "REGULAR" | "EXTRA_TIME";
  member: MatchPlayer | null;
};

export type MatchKick = {
  teamId: string;
  order: number;
  scored: boolean;
  member: MatchPlayer | null;
};

export type MatchBooking = {
  cardType: string;
  minute: number | null;
  teamId: string;
  member: MatchPlayer;
};

export type PublicMatch = {
  id: string;
  firstTeam: MatchTeam | null;
  secondTeam: MatchTeam | null;
  matchDate: Date | null;
  round: string | null;
  venue: string | null;
  isKnockout: boolean;
  bracketRound: number | null;
  order: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  status: string;
  forfeitWinnerTeamId: string | null;
  manOfTheMatch: MatchPlayer | null;
  goals: MatchGoal[];
  penaltyKicks: MatchKick[];
  bookings: MatchBooking[];
  parts: PartRow[];
  adjustments: RecordedAdjustmentRow[];
  series: SeriesStandingRow | null;
  mvpVote: {
    id: string;
    status: string;
    closesAt: string | Date;
    candidates: {
      id: string;
      member: { id: string; fullName: string };
      _count: { votes: number };
    }[];
  } | null;
};

export type DecidedMatch = PublicMatch & { firstTeam: MatchTeam; secondTeam: MatchTeam };
