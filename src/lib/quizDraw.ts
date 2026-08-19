import { DIFFICULTIES, difficultyOf, type Difficulty } from "./quizDifficulty";
import { countedNoun, QUESTIONS, ROUNDS } from "./arabicPlural";
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
  questionCount: number;
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

function deepestCategory(left: Map<string, BankQuestion[]>, questionCount: number): string | null {
  let best: string | null = null;
  let depth = 0;
  for (const [category, questions] of [...left].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (questions.length >= questionCount && questions.length > depth) {
      best = category;
      depth = questions.length;
    }
  }
  return best;
}

export function drawShortfall(shape: DrawShape, planned: number, bankSize: number): string | null {
  if (planned >= shape.roundCount) return null;
  const needed = shape.roundCount * shape.questionCount;
  return shape.categoryRounds
    ? `التصنيفات لا تكفي، كل جولة تحتاج ${countedNoun(shape.questionCount, QUESTIONS)} من تصنيف واحد، وأمكن تجهيز ${countedNoun(planned, ROUNDS)} من ${shape.roundCount}`
    : `المخزون لا يكفي، المطلوب ${countedNoun(needed, QUESTIONS)} والمتوفر ${bankSize}`;
}

export function planRounds(bank: BankQuestion[], shape: DrawShape, seed: string): RoundPlan[] {
  const plans: RoundPlan[] = [];
  let left = bank;
  const groups = byCategory(bank);

  for (let index = 0; index < shape.roundCount; index++) {
    const category = shape.categoryRounds ? deepestCategory(groups, shape.questionCount) : null;
    if (shape.categoryRounds && !category) break;

    const from = category ? groups.get(category)! : left;
    const drawn = spreadByDifficulty(from, shape.questionCount, `${seed}:${index}`);
    if (drawn.length < shape.questionCount) break;

    const taken = new Set(drawn.map((q) => q.id));
    if (category)
      groups.set(
        category,
        from.filter((q) => !taken.has(q.id)),
      );
    else left = left.filter((q) => !taken.has(q.id));

    plans.push({ index, category, questionIds: drawn.map((q) => q.id) });
  }

  return plans;
}
