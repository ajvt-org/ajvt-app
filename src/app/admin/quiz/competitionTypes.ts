import type { BoardConfig, Visibility } from "@/lib/competitionConfig";

export interface Competition {
  id: string;
  name: string;
  startsAt: string;
  visibility: Visibility;
  roundCount: number;
  roundPeriodMinutes: number;
  roundWindowMinutes: number;
  servedCount: number;
  boards: BoardConfig[];
  categoryRounds: boolean;
  bankId: string;
  fullSeconds: number;
  maxSeconds: number;
  floorPercent: number;
  startedAt: string | null;
}

export interface CompetitionRow extends Competition {
  _count: { participants: number; rounds: number };
}

export interface CompetitionDefaults {
  visibility: Visibility;
  categoryRounds: boolean;
  bankId: string;
  roundCount: number;
  roundPeriodMinutes: number;
  roundWindowMinutes: number;
  servedCount: number;
  boards: BoardConfig[];
  fullSeconds: number;
  maxSeconds: number;
  floorPercent: number;
}

export function toLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export const CUSTOM_PERIOD = -1;

export const PERIOD_CHOICES = [
  { minutes: 60, label: "كل ساعة" },
  { minutes: 120, label: "كل ساعتين" },
  { minutes: 360, label: "كل ست ساعات" },
  { minutes: 720, label: "كل اثنتي عشرة ساعة" },
  { minutes: 1440, label: "كل يوم" },
  { minutes: 10080, label: "كل أسبوع" },
  { minutes: CUSTOM_PERIOD, label: "مدة أخرى" },
];

export function isPresetPeriod(minutes: number): boolean {
  return PERIOD_CHOICES.some((c) => c.minutes !== CUSTOM_PERIOD && c.minutes === minutes);
}

export const VISIBILITY_CHOICES: { value: Visibility; label: string }[] = [
  { value: "PUBLIC", label: "عامة لكل المنتسبين" },
  { value: "PRIVATE", label: "خاصة بمشاركين محددين" },
];
