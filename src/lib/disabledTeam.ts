export interface DisabledSide {
  disabledAt?: Date | string | null;
}

export function teamIsDisabled(side: DisabledSide | null | undefined): boolean {
  return side?.disabledAt != null;
}

export function matchIsDisabled(match: {
  firstTeam?: DisabledSide | null;
  secondTeam?: DisabledSide | null;
}): boolean {
  return teamIsDisabled(match.firstTeam) || teamIsDisabled(match.secondTeam);
}

export const DISABLED_CARD = { opacity: 0.5 };
