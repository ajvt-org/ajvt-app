export interface NounForms {
  one: string;
  two: string;
  few: string;
  many: string;
  other: string;
}

export function countedNoun(count: number, forms: NounForms): string {
  if (count === 1) return forms.one;
  if (count === 2) return forms.two;
  const tail = count % 100;
  if (tail >= 3 && tail <= 10) return `${count} ${forms.few}`;
  if (tail >= 11) return `${count} ${forms.many}`;
  return `${count} ${forms.other}`;
}

export const QUESTIONS: NounForms = {
  one: "سؤال واحد",
  two: "سؤالين",
  few: "أسئلة",
  many: "سؤالاً",
  other: "سؤال",
};

export const POINTS: NounForms = {
  one: "نقطة واحدة",
  two: "نقطتين",
  few: "نقاط",
  many: "نقطة",
  other: "نقطة",
};

export const SECONDS: NounForms = {
  one: "ثانية واحدة",
  two: "ثانيتين",
  few: "ثوانٍ",
  many: "ثانية",
  other: "ثانية",
};

export const ROUNDS: NounForms = {
  one: "جولة واحدة",
  two: "جولتين",
  few: "جولات",
  many: "جولة",
  other: "جولة",
};

export const ANSWERS: NounForms = {
  one: "إجابة واحدة",
  two: "إجابتين",
  few: "إجابات",
  many: "إجابة",
  other: "إجابة",
};

export const HOURS: NounForms = {
  one: "ساعة واحدة",
  two: "ساعتين",
  few: "ساعات",
  many: "ساعة",
  other: "ساعة",
};

export function hoursLabel(hours: number): string {
  return countedNoun(hours, HOURS);
}

export function countedLabel(count: number, one: string, two: string, many: string): string {
  if (count === 1) return one;
  if (count === 2) return two;
  return many;
}
