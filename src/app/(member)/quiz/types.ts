export interface AnswerData {
  id: string;
  text: string;
  order: number;
}

export interface QuestionData {
  id: string;
  text: string;
  category: string;
  points: number;
  correctCount: number;
  answers: AnswerData[];
}

export interface PendingAssignment {
  id: string;
  sentAt: string;
  revealedAt: string | null;
  question: QuestionData;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  photoUrl: string | null;
  total: number;
}

export interface QuizMeData {
  pending: PendingAssignment[];
  totalPoints: number;
  rank: number;
  totalParticipants: number;
  top10: LeaderboardEntry[];
  streak: { current: number; longest: number };
  answerWindowSeconds: number;
}

export interface AnswerResult {
  isCorrect: boolean;
  pointsAwarded: number;
  correctAnswerIds: string[];
  expired?: boolean;
  answeredInMs?: number;
  maxPoints?: number;
}

export interface RunningCompetition {
  id: string;
  name: string;
  visibility: "PUBLIC" | "PRIVATE";
  roundCount: number;
  startsAt: string;
}
