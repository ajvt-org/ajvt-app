// Goal rows come straight from the admin form, so every field is unknown
// until checked. A minute outside 1..130 is a typo, not a real match event.
export interface GoalInput {
  memberId: string;
  count: number;
  minute: number | null;
}

export function validateGoals(input: unknown): GoalInput[] | null {
  if (input === undefined) return [];
  if (!Array.isArray(input)) return null;
  const goals: GoalInput[] = [];
  for (const g of input) {
    if (!g || typeof g.memberId !== "string") return null;
    const count = Number(g.count);
    if (!Number.isInteger(count) || count <= 0) return null;
    let minute: number | null = null;
    if (g.minute !== undefined && g.minute !== null && g.minute !== "") {
      const m = Number(g.minute);
      if (!Number.isInteger(m) || m < 1 || m > 130) return null;
      minute = m;
    }
    goals.push({ memberId: g.memberId, count, minute });
  }
  return goals;
}
