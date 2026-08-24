import { roundsBegun, roundState } from "./quizRound";

export interface CompetitionRowInput {
  competition: {
    id: string;
    name: string;
    visibility: string;
    startsAt: Date;
    startedAt: Date | null;
    roundCount: number;
    roundPeriodMinutes: number;
    roundWindowMinutes: number;
  };
  mine: { score: number }[];
}

export function competitionRows(rows: CompetitionRowInput[], now: Date) {
  return rows.map(({ competition, mine }) => {
    const shape = {
      startsAt: competition.startsAt,
      roundCount: competition.roundCount,
      roundPeriodMinutes: competition.roundPeriodMinutes,
      roundWindowMinutes: competition.roundWindowMinutes,
    };
    return {
      id: competition.id,
      name: competition.name,
      visibility: competition.visibility,
      roundCount: competition.roundCount,
      startsAt: competition.startsAt,
      state: competition.startedAt ? roundState(shape, now) : "before",
      passedRounds: competition.startedAt ? roundsBegun(shape, now) : 0,
      myScore: mine.reduce((sum, a) => sum + a.score, 0),
    };
  });
}
