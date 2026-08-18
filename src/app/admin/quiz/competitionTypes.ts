import type { SpeedBand } from "@/lib/competitionConfig";

export interface Competition {
  id: string;
  name: string;
  startsOn: string;
  days: number;
  publishMinutes: number;
  cutoffMinutes: number;
  servedCount: number;
  poolSize: number;
  weeklyCountingDays: number;
  speedBands: SpeedBand[];
  startedAt: string | null;
}

export interface CompetitionDefaults {
  days: number;
  publishMinutes: number;
  cutoffMinutes: number;
  servedCount: number;
  poolSize: number;
  weeklyCountingDays: number;
  speedBands: SpeedBand[];
}

export function toTimeValue(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export function fromTimeValue(value: string): number {
  const [h, m] = value.split(":").map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return 0;
  return h * 60 + m;
}
