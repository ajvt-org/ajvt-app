export const QUIZ_FILTER_KEYS = ["q"];

export interface QuizFilters {
  q: string;
}

export function readQuizFilters(params: URLSearchParams): QuizFilters {
  return { q: params.get("q") || "" };
}

export function writeQuizFilters(filters: QuizFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  return params;
}
