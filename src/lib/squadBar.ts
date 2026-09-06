import type { SquadSize } from "./squadSize";

export interface OutsideShare {
  count: number;
  limit: number;
}

export interface Segment {
  start: number;
  width: number;
}

export interface BarTick {
  at: number;
  dashed: boolean;
}

export interface AxisNumeral {
  value: number;
  at: number;
  dashed: boolean;
}

export interface SquadBarGeometry {
  min: number | null;
  max: number;
  scale: number;
  short: boolean;
  fill: number;
  over: Segment | null;
  outsideOver: Segment | null;
  hatch: number | null;
  ticks: BarTick[];
  countAt: number;
  axis: AxisNumeral[];
}

export function squadScale(max: number, count: number): number {
  return Math.max(max, count, 1);
}

export function percentOf(value: number, scale: number): number {
  return (value / scale) * 100;
}

export function insideTrack(at: number): number {
  return Math.min(Math.max(at, 6), 94);
}

export function squadBarGeometry(
  count: number,
  squad: SquadSize,
  outside: OutsideShare | null,
): SquadBarGeometry | null {
  const max = squad.max;
  if (max === null) return null;

  const min = squad.min;
  const scale = squadScale(max, count);
  const at = (value: number) => percentOf(value, scale);
  const shared = outside ? Math.min(outside.count, count) : 0;
  const minShown = min !== null && min < scale;
  const outsideShown = outside !== null && outside.limit < scale;

  const ticks: BarTick[] = [];
  if (minShown) ticks.push({ at: at(min), dashed: false });
  ticks.push({ at: at(max), dashed: false });
  if (outsideShown) ticks.push({ at: at(outside.limit), dashed: true });

  const axis: AxisNumeral[] = [];
  if (outsideShown) axis.push({ value: outside.limit, at: at(outside.limit), dashed: true });
  if (minShown) axis.push({ value: min, at: at(min), dashed: false });
  axis.push({ value: max, at: at(max), dashed: false });

  return {
    min,
    max,
    scale,
    short: min !== null && count < min,
    fill: at(Math.min(count, max)),
    over: count > max ? { start: at(max), width: at(count) - at(max) } : null,
    outsideOver:
      outside !== null && shared > outside.limit
        ? { start: at(outside.limit), width: at(shared) - at(outside.limit) }
        : null,
    hatch: shared > 0 ? at(shared) : null,
    ticks,
    countAt: insideTrack(at(count)),
    axis,
  };
}
