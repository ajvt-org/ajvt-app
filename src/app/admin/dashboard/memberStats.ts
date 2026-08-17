import type { Member } from "./types";

export type Breakdown = [string, number][];

export function statusCounts(members: Member[]) {
  return {
    ALL: members.length,
    PENDING: members.filter((m) => m.status === "PENDING").length,
    ACTIVE: members.filter((m) => m.status === "ACTIVE").length,
    REJECTED: members.filter((m) => m.status === "REJECTED").length,
  };
}

function countBy(members: Member[], pick: (m: Member) => string): Breakdown {
  const map: Record<string, number> = {};
  members.forEach((m) => {
    const key = pick(m);
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

export function ageBreakdown(members: Member[]): Breakdown {
  return countBy(members, (m) => m.age);
}

export function paymentBreakdown(members: Member[]): Breakdown {
  return countBy(members, (m) => m.paymentMethod);
}

export function signupsByDay(members: Member[], days = 14) {
  const counts: Record<string, number> = {};
  members.forEach((m) => {
    const key = new Date(m.createdAt).toISOString().slice(0, 10);
    counts[key] = (counts[key] || 0) + 1;
  });

  const out: { label: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ label: String(d.getDate()), value: counts[key] || 0 });
  }
  return out;
}
