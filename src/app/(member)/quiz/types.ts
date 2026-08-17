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
}

export interface AnswerResult {
  isCorrect: boolean;
  pointsAwarded: number;
  correctAnswerIds: string[];
}
