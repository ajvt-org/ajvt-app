export function foldArabic(text: string): string {
  return text
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ـً-ْ]/g, "");
}

export function searchKey(text: string): string {
  return foldArabic(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function searchTokens(query: string): string[] {
  const key = searchKey(query);
  return key ? key.split(" ") : [];
}

export function matchesSearch(haystack: string, tokens: string[]): boolean {
  const key = searchKey(haystack);
  return tokens.every((token) => key.includes(token));
}
