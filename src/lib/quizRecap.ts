export interface AnswerTally {
  answered: number;
  correct: number;
}

export interface TallyRow {
  questionId: string;
  isCorrect: boolean | null;
  count: number;
}

export const NO_TALLY: AnswerTally = { answered: 0, correct: 0 };

export function talliesOf(rows: TallyRow[]): Map<string, AnswerTally> {
  const tallies = new Map<string, AnswerTally>();
  for (const row of rows) {
    const tally = tallies.get(row.questionId) ?? { answered: 0, correct: 0 };
    if (row.isCorrect !== null) {
      tally.answered += row.count;
      if (row.isCorrect) tally.correct += row.count;
    }
    tallies.set(row.questionId, tally);
  }
  return tallies;
}

export function correctRate(tally: AnswerTally): number | null {
  if (tally.answered === 0) return null;
  return Math.round((tally.correct / tally.answered) * 100);
}
