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
  member: { id: string; fullName: string; phone: string; age: string; photo: string | null };
}

export interface Team {
  id: string;
  name: string;
  autoNamed: boolean;
  logo: string | null;
  groupId: string | null;
  group: Group | null;
  members: TeamMemberEntry[];
}

export interface MatchGoal {
  id: string;
  count: number;
  minute: number | null;
  teamId: string;
  member: { id: string; fullName: string; photo: string | null };
}

export interface MatchBooking {
  id: string;
  cardType: "YELLOW" | "RED";
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
  candidates: MvpCandidate[];
}

export interface Match {
  id: string;
  homeTeam: { id: string; name: string; logo: string | null };
  awayTeam: { id: string; name: string; logo: string | null };
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
  status: "SCHEDULED" | "PLAYED";
  goals: MatchGoal[];
  bookings: MatchBooking[];
  mvpVote: MvpVote | null;
}

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
