// Two spellings of one Mauritanian name, reduced to the same key. Arabic gives
// several ways to write the same sound and people use all of them: the hamza
// forms of alef, ة against ه, ى against ي, tatweel and diacritics that may or
// may not be typed. The patronymic marker goes too, since "مراد وجاه" and
// "مراد ولد وجاه" are one person.
//
// Deliberately crude: it answers "worth a second look", not "same person". A
// false pair costs an admin one glance; a missed one costs a duplicate
// membership, which is what it is here to prevent.
const PATRONYMIC = new Set(["ولد", "بنت", "ابن"]);

export function nameKey(name: string): string {
  return name
    .split(/\s+/)
    .map((word) =>
      word
        .replace(/[أإآٱ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/[ـً-ْ]/g, "")
        .replace(/[^\p{L}\p{N}]/gu, ""),
    )
    .filter((word) => word.length > 0 && !PATRONYMIC.has(word))
    .join("");
}
