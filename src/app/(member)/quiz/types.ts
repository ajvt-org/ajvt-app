export interface AnswerResult {
  isCorrect: boolean;
  pointsAwarded: number;
  correctAnswerIds: string[];
  expired?: boolean;
  answeredInMs?: number;
  maxPoints?: number;
}

export type CompetitionState = "before" | "open" | "closed" | "over";

export interface RunningCompetition {
  id: string;
  name: string;
  visibility: "PUBLIC" | "PRIVATE";
  roundCount: number;
  startsAt: string;
  state: CompetitionState;
  passedRounds: number;
  myScore: number;
}

export interface AttemptSummary {
  attemptId: string | null;
  round: number;
  category: string | null;
  score: number;
  correct: number;
  total: number;
  finishedAt: string | null;
  missed: boolean;
  voided: boolean;
  closed: boolean;
}

export interface RecapQuestion {
  id: string;
  text: string;
  category: string;
  correct: string[];
  answered: number;
  right: number;
  rate: number | null;
}

export interface RoundRecapData {
  round: number;
  category: string | null;
  closesAt: string;
  players: number;
  questions: RecapQuestion[];
}
