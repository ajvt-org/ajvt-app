export function isArabicName(value: string): boolean {
  return /^[؀-ۿ\s]+$/.test(value.trim());
}

export const INITIALS_JOINER = "\u200c";

function openingLetter(word: string): string {
  return Array.from(word)[0] ?? "";
}

export function nameInitials(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = openingLetter(words[0]);
  if (words.length === 1) return first;
  return first + INITIALS_JOINER + openingLetter(words[words.length - 1]);
}
