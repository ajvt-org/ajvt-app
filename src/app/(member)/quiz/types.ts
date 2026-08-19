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
  playedRounds: number;
  myScore: number;
}

export interface BreakdownRowView {
  position: number;
  question: string;
  category: string;
  maxPoints: number;
  isCorrect: boolean | null;
  elapsedMs: number | null;
  points: number;
  percent: number;
  correct: string[];
  chosen: string[];
}

export interface AttemptDetailView {
  attemptId: string;
  round: number;
  category: string | null;
  competitionName: string;
  curve: { fullSeconds: number; maxSeconds: number; floorPercent: number };
  boards: { title: string; blockRounds: number; counting: number; wholeRun: boolean }[];
  breakdown: {
    rows: BreakdownRowView[];
    correct: number;
    answered: number;
    total: number;
    score: number;
    possible: number;
    elapsedMs: number;
  };
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
}
