export interface AnswerRow {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface QuestionRow {
  id: string;
  text: string;
  category: string;
  points: number;
  correctCount: number;
  active: boolean;
  createdAt: string;
  answers: AnswerRow[];
  sentCount: number;
  answeredCount: number;
  correctSubmissions: number;
}

export interface QuizSettings {
  defaultAnswerCount: number;
  defaultCorrectCount: number;
  defaultPoints: number;
  questionsPerDay: number;
  answerWindowSeconds: number;
  minScorePercent: number;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  name: string;
  photoUrl: string | null;
  total: number;
  currentStreak: number;
  longestStreak: number;
}

export interface AnswerFormRow {
  text: string;
  isCorrect: boolean;
}

export type SettingsKey = "defaultAnswerCount" | "defaultCorrectCount" | "defaultPoints";

export type SettingsForm = Record<SettingsKey, string>;

export const emptySettingsForm: SettingsForm = {
  defaultAnswerCount: "4",
  defaultCorrectCount: "1",
  defaultPoints: "10",
};
