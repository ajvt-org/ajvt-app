import { foldArabic } from "./arabicText";

const PATRONYMIC = new Set(["ولد", "بنت", "ابن"]);

export function nameKey(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => foldArabic(word).replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((word) => word.length > 0 && !PATRONYMIC.has(word))
    .join("");
}
