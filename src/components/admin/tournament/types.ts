import type { PartRow, SeriesStandingRow } from "./seriesTypes";

export type TournamentFormat = "KNOCKOUT" | "GROUPS_THEN_KNOCKOUT" | null;

export interface RosterMember {
  id: string;
  fullName: string;
  phone: string;
  age: string;
  photo: string | null;
  team: { id: string; name: string } | null;
}

export interface Group {
  id: string;
  name: string;
  capacity: number | null;
}

export interface TeamMemberEntry {
  status: "PENDING" | "ACTIVE";
  member: {
    id: string;
    fullName: string;
    phone: string;
    age: string;
    village: string;
    photo: string | null;
  };
}

export interface Team {
  id: string;
  name: string;
  autoNamed: boolean;
  fromHomeVillage: boolean;
  logo: string | null;
  captainUserId: string | null;
  groupId: string | null;
  group: Group | null;
  members: TeamMemberEntry[];
}

export type GoalKind = "GOAL" | "PENALTY" | "OWN_GOAL";
export type GoalPeriod = "REGULAR" | "EXTRA_TIME";

export interface MatchGoal {
  id: string;
  count: number;
  minute: number | null;
  teamId: string;
  kind: GoalKind;
  period: GoalPeriod;
  member: { id: string; fullName: string; photo: string | null } | null;
}

export interface PenaltyKick {
  id: string;
  teamId: string;
  order: number;
  scored: boolean;
  member: { id: string; fullName: string; photo: string | null } | null;
}

export interface MatchBooking {
  id: string;
  cardType: string;
  minute: number | null;
  teamId: string;
  member: { id: string; fullName: string; photo: string | null };
}

export interface MvpCandidate {
  id: string;
  memberId: string;
  member: { id: string; fullName: string };
  _count: { votes: number };
}

export interface MvpVote {
  id: string;
  status: "OPEN" | "CLOSED";
  closesAt: string;
  candidates: MvpCandidate[];
}

export interface Match {
  id: string;
  firstTeam: { id: string; name: string; logo: string | null; photo?: string | null } | null;
  secondTeam: { id: string; name: string; logo: string | null; photo?: string | null } | null;
  matchDate: string | null;
  round: string | null;
  venue: string | null;
  order: number;
  isKnockout: boolean;
  bracketRound: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  manOfTheMatch: { id: string; fullName: string; photo: string | null } | null;
  forfeitWinnerTeamId: string | null;
  status: "SCHEDULED" | "PLAYED";
  goals: MatchGoal[];
  bookings: MatchBooking[];
  penaltyKicks: PenaltyKick[];
  parts: PartRow[];
  series: SeriesStandingRow | null;
  mvpVote: MvpVote | null;
}

export type DecidedMatch = Match & {
  firstTeam: NonNullable<Match["firstTeam"]>;
  secondTeam: NonNullable<Match["secondTeam"]>;
};

export interface Suspension {
  id: string;
  reason: "RED_CARD" | "YELLOW_CARDS" | "CONDUCT";
  scope: "MATCHES" | "DAYS" | "INDEFINITE";
  matches: number | null;
  until: string | null;
  note: string | null;
  status: "PROPOSED" | "ACTIVE" | "LIFTED";
  createdBy: string;
  decidedBy: string | null;
  createdAt: string;
  running: boolean;
  member: { id: string; fullName: string; photo: string | null };
}

export interface DisciplineRules {
  yellowsForBan: number;
  redBanMatches: number;
}

export type Tab = "teams" | "days" | "matches" | "standings" | "scorers" | "discipline";
