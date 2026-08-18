import {
  CAPITALS,
  CURRENCIES,
  SCIENCE,
  RELIGION,
  LANGUAGE,
  SPORT,
  HEALTH,
  HISTORY,
  NATURE,
  type Fact,
} from "./questionData";

export type QuestionSpec = [string, string, string[], number, number];

function shuffled(correct: string, distractors: string[], seed: number) {
  const options = [correct, ...distractors];
  for (let i = options.length - 1; i > 0; i--) {
    const j = (seed * (i + 7)) % (i + 1);
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { options, correctIndex: options.indexOf(correct) };
}

function numberOptions(correct: number, seed: number) {
  const deltas = [1, 2, 3, 5, 7, 10];
  const seen = new Set<number>([correct]);
  const distractors: string[] = [];
  let k = 0;
  while (distractors.length < 3) {
    const delta = deltas[(seed + k) % deltas.length] * (k % 2 === 0 ? 1 : -1);
    const candidate = correct + delta * (1 + Math.floor(k / deltas.length));
    k++;
    if (candidate < 0 || seen.has(candidate)) continue;
    seen.add(candidate);
    distractors.push(String(candidate));
  }
  return shuffled(String(correct), distractors, seed);
}

function fromFacts(category: string, facts: Fact[]): QuestionSpec[] {
  return facts.map(([text, options, correctIndex, points], i) => {
    const { options: mixed, correctIndex: at } = shuffled(
      options[correctIndex],
      options.filter((_, j) => j !== correctIndex),
      i + 3,
    );
    return [text, category, mixed, at, points] as QuestionSpec;
  });
}

function pairs(
  category: string,
  rows: [string, string][],
  ask: (a: string) => string,
  points: (i: number) => number,
): QuestionSpec[] {
  return rows.map(([subject, answer], i) => {
    const others = rows.filter((_, j) => j !== i).map(([, v]) => v);
    const picked: string[] = [];
    for (let k = 0; picked.length < 3 && k < others.length * 2; k++) {
      const candidate = others[(i * 13 + k * 7 + 3) % others.length];
      if (candidate !== answer && !picked.includes(candidate)) picked.push(candidate);
    }
    const { options, correctIndex } = shuffled(answer, picked, i + 2);
    return [ask(subject), category, options, correctIndex, points(i)] as QuestionSpec;
  });
}

function arithmetic(): QuestionSpec[] {
  const out: QuestionSpec[] = [];
  for (let i = 0; i < 26; i++) {
    const a = 12 + ((i * 17) % 88);
    const b = 3 + ((i * 29) % 60);
    const { options, correctIndex } = numberOptions(a + b, i + 1);
    out.push([`كم يساوي ${a} + ${b}؟`, "حساب", options, correctIndex, 10 + (i % 4) * 10]);
  }
  for (let i = 0; i < 22; i++) {
    const a = 60 + ((i * 23) % 140);
    const b = 5 + ((i * 13) % 50);
    const { options, correctIndex } = numberOptions(a - b, i + 3);
    out.push([`كم يساوي ${a} - ${b}؟`, "حساب", options, correctIndex, 20 + (i % 3) * 10]);
  }
  for (let i = 0; i < 22; i++) {
    const a = 3 + (i % 15);
    const b = 4 + ((i * 7) % 17);
    const { options, correctIndex } = numberOptions(a * b, i + 5);
    out.push([`كم يساوي ${a} × ${b}؟`, "حساب", options, correctIndex, 50 + (i % 3) * 10]);
  }
  for (let i = 0; i < 18; i++) {
    const base = 200 + i * 20;
    const pct = [10, 20, 25, 50][i % 4];
    const { options, correctIndex } = numberOptions((base * pct) / 100, i + 9);
    out.push([`كم يساوي ${pct}٪ من ${base}؟`, "حساب", options, correctIndex, 80 + (i % 3) * 10]);
  }
  for (let i = 2; i <= 30; i++) {
    const { options, correctIndex } = numberOptions(i * i, i);
    out.push([
      `ما مربع العدد ${i}؟`,
      "حساب",
      options,
      correctIndex,
      i < 12 ? 30 : i < 22 ? 60 : 85,
    ]);
  }
  return out;
}

export function questionBank(): QuestionSpec[] {
  const all: QuestionSpec[] = [
    ...pairs(
      "جغرافيا",
      CAPITALS,
      (c) => `ما عاصمة ${c}؟`,
      (i) => (i < 20 ? 15 : i < 36 ? 55 : 85),
    ),
    ...pairs(
      "عملات",
      CURRENCIES,
      (c) => `ما عملة ${c}؟`,
      (i) => (i < 6 ? 20 : i < 12 ? 60 : 85),
    ),
    ...fromFacts("علوم", SCIENCE),
    ...fromFacts("دين", RELIGION),
    ...fromFacts("لغة عربية", LANGUAGE),
    ...fromFacts("رياضة", SPORT),
    ...fromFacts("صحة", HEALTH),
    ...fromFacts("تاريخ", HISTORY),
    ...fromFacts("طبيعة", NATURE),
    ...arithmetic(),
  ];

  const seen = new Set<string>();
  return all.filter(([text]) => {
    const key = text.replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
