import { countCategory, type CountedNoun } from "./arabicCount";

export interface NounForms extends CountedNoun {
  other: string;
}

export function countedNoun(count: number, forms: NounForms): string {
  const category = countCategory(count);
  if (category === "one") return forms.one;
  if (category === "two") return forms.two;
  if (category === "few") return `${count} ${forms.few}`;
  if (category === "many") return `${count} ${forms.many}`;
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

export const MATCHES: NounForms = {
  one: "مباراة واحدة",
  two: "مباراتان",
  few: "مباريات",
  many: "مباراة",
  other: "مباراة",
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

export const CORRECT_ANSWERS: NounForms = {
  one: "إجابة صحيحة واحدة",
  two: "إجابتين صحيحتين",
  few: "إجابات صحيحة",
  many: "إجابة صحيحة",
  other: "إجابة صحيحة",
};

export const PLAYERS: NounForms = {
  one: "لاعب واحد",
  two: "لاعبان",
  few: "لاعبين",
  many: "لاعباً",
  other: "لاعب",
};

export const DAYS: NounForms = {
  one: "يوم واحد",
  two: "يومين",
  few: "أيام",
  many: "يوماً",
  other: "يوم",
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
