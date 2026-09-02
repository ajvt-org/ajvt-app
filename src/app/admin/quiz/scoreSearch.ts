import { matchesSearch, searchTokens } from "@/lib/arabicText";
import type { AttemptRow } from "./scoreTypes";

export function matchingAttempts(rows: AttemptRow[], query: string): AttemptRow[] {
  const tokens = searchTokens(query);
  return tokens.length ? rows.filter((row) => matchesSearch(row.name, tokens)) : rows;
}
