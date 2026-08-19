import { DIFFICULTIES, difficultyOf, type Difficulty } from "./quizDifficulty";
import { seededShuffle } from "./quizRound";

export interface BankQuestion {
  id: string;
  category: string;
  points: number;
}

export interface RoundPlan {
  index: number;
  category: string | null;
  questionIds: string[];
}

export interface DrawShape {
  roundCount: number;
  poolSize: number;
  categoryRounds: boolean;
}

export function spreadByDifficulty(
  questions: BankQuestion[],
  count: number,
  seed: string,
): BankQuestion[] {
  const bands = new Map<Difficulty, BankQuestion[]>(
    DIFFICULTIES.map((d) => [d, [] as BankQuestion[]]),
  );
  for (const question of seededShuffle(questions, seed)) {
    bands.get(difficultyOf(question.points))!.push(question);
  }

  const picked: BankQuestion[] = [];
  while (picked.length < count) {
    let took = false;
    for (const band of DIFFICULTIES) {
      if (picked.length >= count) break;
      const next = bands.get(band)!.pop();
      if (!next) continue;
      picked.push(next);
      took = true;
    }
    if (!took) break;
  }
  return picked;
}

function byCategory(questions: BankQuestion[]): Map<string, BankQuestion[]> {
  const out = new Map<string, BankQuestion[]>();
  for (const question of questions) {
    out.set(question.category, [...(out.get(question.category) ?? []), question]);
  }
  return out;
}

function deepestCategory(left: Map<string, BankQuestion[]>, poolSize: number): string | null {
  let best: string | null = null;
  let depth = 0;
  for (const [category, questions] of [...left].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (questions.length >= poolSize && questions.length > depth) {
      best = category;
      depth = questions.length;
    }
  }
  return best;
}

export function planRounds(bank: BankQuestion[], shape: DrawShape, seed: string): RoundPlan[] {
  const plans: RoundPlan[] = [];
  let left = bank;
  const groups = byCategory(bank);

  for (let index = 0; index < shape.roundCount; index++) {
    const category = shape.categoryRounds ? deepestCategory(groups, shape.poolSize) : null;
    if (shape.categoryRounds && !category) break;

    const from = category ? groups.get(category)! : left;
    const drawn = spreadByDifficulty(from, shape.poolSize, `${seed}:${index}`);
    if (drawn.length < shape.poolSize) break;

    const taken = new Set(drawn.map((q) => q.id));
    if (category) groups.set(category, from.filter((q) => !taken.has(q.id)));
    else left = left.filter((q) => !taken.has(q.id));

    plans.push({ index, category, questionIds: drawn.map((q) => q.id) });
  }

  return plans;
}
