import { generateMatchSchedule } from "./tournament";

export interface GroupEntry {
  index: number;
  teamIds: string[];
}

export interface GroupFixture {
  groupIndex: number;
  round: number;
  firstTeamId: string;
  secondTeamId: string;
}

export function groupRoundRobin(groups: GroupEntry[]): GroupFixture[] {
  const byGroup = groups.map((g) => generateMatchSchedule(g.teamIds, g.teamIds.length - 1));
  const lastRound = byGroup.reduce(
    (last, fixtures) => fixtures.reduce((r, f) => Math.max(r, f.round), last),
    0,
  );

  const ordered: GroupFixture[] = [];
  for (let round = 1; round <= lastRound; round++) {
    groups.forEach((group, i) => {
      for (const f of byGroup[i]) {
        if (f.round !== round) continue;
        ordered.push({
          groupIndex: group.index,
          round,
          firstTeamId: f.firstTeamId,
          secondTeamId: f.secondTeamId,
        });
      }
    });
  }
  return ordered;
}

export function groupRoundSizes(fixtures: GroupFixture[]): number[] {
  const sizes: number[] = [];
  for (const f of fixtures) sizes[f.round - 1] = (sizes[f.round - 1] ?? 0) + 1;
  return sizes.map((n) => n ?? 0);
}
