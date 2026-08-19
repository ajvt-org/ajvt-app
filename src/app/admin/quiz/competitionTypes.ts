import type { SpeedBand, Visibility } from "@/lib/competitionConfig";

export interface Competition {
  id: string;
  name: string;
  startsAt: string;
  visibility: Visibility;
  roundCount: number;
  roundPeriodMinutes: number;
  roundWindowMinutes: number;
  servedCount: number;
  poolSize: number;
  groupSize: number;
  countingRounds: number;
  categoryRounds: boolean;
  speedBands: SpeedBand[];
  startedAt: string | null;
}

export interface CompetitionRow extends Competition {
  _count: { participants: number; rounds: number };
}

export interface CompetitionDefaults {
  visibility: Visibility;
  categoryRounds: boolean;
  roundCount: number;
  roundPeriodMinutes: number;
  roundWindowMinutes: number;
  servedCount: number;
  poolSize: number;
  groupSize: number;
  countingRounds: number;
  speedBands: SpeedBand[];
}

export function toLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function fromLocalInput(value: string): string {
  if (!value) return "";
  const d = new Date(`${value}:00.000Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export const PERIOD_CHOICES = [
  { minutes: 60, label: "كل ساعة" },
  { minutes: 120, label: "كل ساعتين" },
  { minutes: 360, label: "كل ست ساعات" },
  { minutes: 720, label: "كل اثنتي عشرة ساعة" },
  { minutes: 1440, label: "كل يوم" },
];

export const VISIBILITY_CHOICES: { value: Visibility; label: string }[] = [
  { value: "PUBLIC", label: "عامة لكل المنتسبين" },
  { value: "PRIVATE", label: "خاصة بمشاركين محددين" },
];
