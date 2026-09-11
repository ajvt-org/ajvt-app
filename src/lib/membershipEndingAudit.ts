export interface EndedMembership {
  year: number;
  endedAt: Date | null;
  endedReason: string | null;
  endedBy: string | null;
}

export function endedDetails(year: number, ending: { reason: string; by: string; at: Date }) {
  return {
    before: { year, endedAt: null, endedReason: null, endedBy: null },
    after: {
      year,
      endedAt: ending.at.toISOString(),
      endedReason: ending.reason,
      endedBy: ending.by,
    },
  };
}

export function restoredDetails(membership: EndedMembership) {
  return {
    before: {
      year: membership.year,
      endedAt: membership.endedAt?.toISOString() ?? null,
      endedReason: membership.endedReason,
      endedBy: membership.endedBy,
    },
    after: { year: membership.year, endedAt: null, endedReason: null, endedBy: null },
  };
}
