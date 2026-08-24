// Lays round chunks onto match days: each chunk (one round of one pool)
// starts a fresh day, its matches take the slot times in order, and a chunk
// larger than the slots spills onto the next day. Day numbers are 0-based
// offsets into the tournament's match days, rest days excluded by the caller.

export interface Placement {
  day: number;
  time: string;
}

export function layoutRounds(chunkSizes: number[], slots: string[]): Placement[][] {
  const times = slots.length > 0 ? slots : ["16:00"];
  const out: Placement[][] = [];
  let day = 0;
  for (const size of chunkSizes) {
    const placements: Placement[] = [];
    for (let i = 0; i < size; i++) {
      const slot = i % times.length;
      if (i > 0 && slot === 0) day++;
      placements.push({ day, time: times[slot] });
    }
    out.push(placements);
    if (size > 0) day++;
  }
  return out;
}

export function matchDaysNeeded(chunkSizes: number[], slots: string[]): number {
  const layout = layoutRounds(chunkSizes, slots);
  const flat = layout.flat();
  return flat.length === 0 ? 0 : Math.max(...flat.map((p) => p.day)) + 1;
}
