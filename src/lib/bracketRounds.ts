export interface RoundedMatch {
  bracketRound: number;
  order: number;
  round: string | null;
}

export interface BracketRound<T extends RoundedMatch> {
  number: number;
  label: string;
  matches: T[];
}

export function bracketRounds<T extends RoundedMatch>(
  matches: T[],
  labelFor: (round: number) => string,
): BracketRound<T>[] {
  const numbers = [...new Set(matches.map((m) => m.bracketRound))].sort((a, b) => a - b);
  return numbers.map((number) => ({
    number,
    label: matches.find((m) => m.bracketRound === number)?.round || labelFor(number),
    matches: matches.filter((m) => m.bracketRound === number).sort((a, b) => a.order - b.order),
  }));
}
