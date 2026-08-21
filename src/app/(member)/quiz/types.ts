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
