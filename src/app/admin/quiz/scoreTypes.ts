export interface AttemptRow {
  attemptId: string;
  userId: string;
  name: string;
  score: number;
  voided: boolean;
  finishedAt: string | null;
}
