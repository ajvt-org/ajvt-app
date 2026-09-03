import { countCategory } from "./arabicCount";
import { ouguiya } from "./texts/currency";
import { numberToArabicWords, MAX_SPELLED } from "./arabicNumberWords";

export const OUGUIYA = ouguiya;

export function amountInWords(amount: number): string {
  if (!Number.isInteger(amount) || amount < 0 || amount > MAX_SPELLED) return "";
  const category = countCategory(amount);
  if (category === "one") return OUGUIYA.one;
  if (category === "two") return OUGUIYA.dual;
  const noun = category === "few" ? OUGUIYA.plural : OUGUIYA.singular;
  return `${numberToArabicWords(amount, "f")} ${noun}`;
}
