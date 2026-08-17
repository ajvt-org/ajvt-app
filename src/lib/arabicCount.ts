export type CountCategory = "zero" | "one" | "two" | "few" | "many" | "other";

export interface CountedNoun {
  one: string;
  two: string;
  few: string;
  many: string;
}

export function countCategory(count: number): CountCategory {
  if (!Number.isInteger(count) || count < 0) return "other";
  if (count === 0) return "zero";
  if (count === 1) return "one";
  if (count === 2) return "two";
  const tail = count % 100;
  if (tail >= 3 && tail <= 10) return "few";
  if (tail >= 11 && tail <= 99) return "many";
  return "other";
}

export function countedNoun(count: number, noun: CountedNoun): string {
  const category = countCategory(count);
  if (category === "zero" || category === "few") return noun.few;
  if (category === "two") return noun.two;
  if (category === "many") return noun.many;
  return noun.one;
}

export function counted(count: number, noun: CountedNoun): string {
  const category = countCategory(count);
  if (category === "one") return noun.one;
  if (category === "two") return noun.two;
  return `${count} ${countedNoun(count, noun)}`;
}
