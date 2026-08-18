import { quiz } from "./messages/quiz";

export const IMPORT_MAX = 500;

export interface ImportAnswer {
  text: string;
  isCorrect: boolean;
}

export interface ImportQuestion {
  text: string;
  category: string;
  points: number;
  correctCount: number;
  answers: ImportAnswer[];
}

export interface ImportProblem {
  index: number;
  message: string;
}

export interface ImportReview {
  questions: ImportQuestion[];
  problems: ImportProblem[];
}

export interface ImportDefaults {
  points: number;
  correctCount: number;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asCount(value: unknown, fallback: number): number {
  return Number.isInteger(value) && (value as number) > 0 ? (value as number) : fallback;
}

function normalise(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function readAnswers(raw: unknown): ImportAnswer[] | null {
  if (!Array.isArray(raw)) return null;
  const answers: ImportAnswer[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      answers.push({ text: entry.trim(), isCorrect: false });
      continue;
    }
    if (!entry || typeof entry !== "object") return null;
    const row = entry as Record<string, unknown>;
    answers.push({ text: asText(row.text), isCorrect: row.isCorrect === true });
  }
  return answers;
}

export function reviewImport(raw: unknown, defaults: ImportDefaults): ImportReview {
  const problems: ImportProblem[] = [];
  if (!Array.isArray(raw)) {
    return { questions: [], problems: [{ index: -1, message: quiz.importNotArray }] };
  }
  if (raw.length === 0) {
    return { questions: [], problems: [{ index: -1, message: quiz.importEmpty }] };
  }
  if (raw.length > IMPORT_MAX) {
    return { questions: [], problems: [{ index: -1, message: quiz.importTooMany }] };
  }

  const questions: ImportQuestion[] = [];
  const seen = new Set<string>();

  raw.forEach((entry, index) => {
    const fail = (message: string) => problems.push({ index, message });

    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      fail(quiz.importNotArray);
      return;
    }
    const row = entry as Record<string, unknown>;

    const text = asText(row.text);
    if (!text) return fail(quiz.textRequired);

    const category = asText(row.category);
    if (!category) return fail(quiz.categoryRequired);

    const answers = readAnswers(row.answers);
    if (!answers) return fail(quiz.twoAnswersMinimum);
    if (answers.length < 2) return fail(quiz.twoAnswersMinimum);
    if (answers.some((a) => !a.text)) return fail(quiz.answersNeedText);

    const answerKeys = new Set(answers.map((a) => normalise(a.text)));
    if (answerKeys.size !== answers.length) return fail(quiz.importAnswersDuplicate);

    const points = asCount(row.points, defaults.points);
    const correctCount = asCount(row.correctCount, defaults.correctCount);
    if (correctCount > answers.length) return fail(quiz.tooManyCorrect);

    const marked = answers.filter((a) => a.isCorrect).length;
    if (marked !== correctCount) {
      return fail(`عدد الإجابات الصحيحة المحددة ${marked} والمطلوب ${correctCount}`);
    }

    const key = normalise(text);
    if (seen.has(key)) return fail(quiz.importDuplicate);
    seen.add(key);

    questions.push({ text, category, points, correctCount, answers });
  });

  return { questions, problems };
}

export function parseImport(source: string, defaults: ImportDefaults): ImportReview {
  let raw: unknown;
  try {
    raw = JSON.parse(source);
  } catch {
    return { questions: [], problems: [{ index: -1, message: quiz.importBadJson }] };
  }
  return reviewImport(raw, defaults);
}
