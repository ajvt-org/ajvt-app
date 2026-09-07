export type ProofKind = "photo" | "membership" | "activity" | "donations" | "expense";

export interface OwnedMatch {
  kind: ProofKind;
  ownerId: string | null;
  confidential: boolean;
}

const REACH: Record<ProofKind, number> = {
  photo: 0,
  membership: 1,
  activity: 1,
  donations: 1,
  expense: 2,
};

const CONFIDENTIAL_WEIGHT = 10;

export function restrictiveness(match: OwnedMatch): number {
  return REACH[match.kind] + (match.confidential ? CONFIDENTIAL_WEIGHT : 0);
}

export function mostRestrictive(matches: (OwnedMatch | null)[]): OwnedMatch | null {
  return matches.reduce<OwnedMatch | null>((chosen, match) => {
    if (!match) return chosen;
    if (!chosen) return match;
    return restrictiveness(match) > restrictiveness(chosen) ? match : chosen;
  }, null);
}
