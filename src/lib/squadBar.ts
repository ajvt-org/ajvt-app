import type { SquadSize } from "./squadSize";

export interface OutsideShare {
  count: number;
  limit: number;
}

export interface Segment {
  start: number;
  width: number;
}

export interface BarMark {
  value: number;
  at: number;
}

export interface BarGeometry {
  fill: number;
  over: Segment | null;
  countAt: number;
  marks: BarMark[];
}

export interface SquadBarGeometry extends BarGeometry {
  min: number | null;
  max: number;
  scale: number;
  short: boolean;
}

export function barScale(cap: number, count: number): number {
  return Math.max(cap, count, 1);
}

export function percentOf(value: number, scale: number): number {
  return (value / scale) * 100;
}

function against(cap: number, count: number, marks: number[]): BarGeometry {
  const scale = barScale(cap, count);
  const at = (value: number) => percentOf(value, scale);

  return {
    fill: at(Math.min(count, cap)),
    over: count > cap ? { start: at(cap), width: at(count) - at(cap) } : null,
    countAt: at(count),
    marks: marks.map((value) => ({ value, at: at(value) })),
  };
}

export function squadBarGeometry(count: number, squad: SquadSize): SquadBarGeometry | null {
  const max = squad.max;
  if (max === null) return null;

  const min = squad.min;
  const scale = barScale(max, count);
  const marks = min !== null && min < scale ? [min, max] : [max];

  return {
    ...against(max, count, marks),
    min,
    max,
    scale,
    short: min !== null && count < min,
  };
}

export function outsideBarGeometry(share: OutsideShare): BarGeometry {
  return against(share.limit, share.count, [share.limit]);
}
