const TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

const LETTERS: Record<string, string> = {
  أ: "ا",
  إ: "ا",
  آ: "ا",
  ٱ: "ا",
  ى: "ي",
  ئ: "ي",
  ؤ: "و",
  ة: "ه",
};

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const EASTERN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function latinDigit(character: string): string {
  const arabic = ARABIC_DIGITS.indexOf(character);
  if (arabic !== -1) return String(arabic);
  const eastern = EASTERN_DIGITS.indexOf(character);
  return eastern !== -1 ? String(eastern) : character;
}

export function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(TASHKEEL, "")
    .split("")
    .map((character) => LETTERS[character] ?? latinDigit(character))
    .join("");
}

export function containsSearch(haystack: string | null | undefined, needle: string): boolean {
  if (!haystack) return false;
  return normalizeSearch(haystack).includes(needle);
}
