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
