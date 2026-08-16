export type MatchTeam = { id: string; name: string; logo: string | null };

export type MatchPlayer = { id: string; fullName: string; photo: string | null };

export type MatchGoal = {
  count: number;
  minute: number | null;
  teamId: string;
  member: MatchPlayer;
};

export type MatchBooking = {
  cardType: string;
  minute: number | null;
  teamId: string;
  member: MatchPlayer;
};

export type PublicMatch = {
  id: string;
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
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
  manOfTheMatch: MatchPlayer | null;
  goals: MatchGoal[];
  bookings: MatchBooking[];
  mvpVote: {
    id: string;
    status: string;
    candidates: {
      id: string;
      member: { id: string; fullName: string };
      _count: { votes: number };
    }[];
  } | null;
};
