export interface AttemptRow {
  attemptId: string;
  userId: string;
  name: string;
  photo: string | null;
  score: number;
  voided: boolean;
  finishedAt: string | null;
}
