export interface SpeedBand {
  maxSeconds: number | null;
  percent: number;
}

export type Visibility = "PUBLIC" | "PRIVATE";

export interface CompetitionConfig {
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
}

export const DEFAULT_BANDS: SpeedBand[] = [
  { maxSeconds: 10, percent: 100 },
  { maxSeconds: 30, percent: 75 },
  { maxSeconds: null, percent: 50 },
];

export const DEFAULT_CONFIG: Omit<CompetitionConfig, "name" | "startsAt"> = {
  visibility: "PUBLIC",
  roundCount: 30,
  roundPeriodMinutes: 1440,
  roundWindowMinutes: 840,
  servedCount: 10,
  poolSize: 30,
  groupSize: 7,
  countingRounds: 6,
  categoryRounds: false,
  speedBands: DEFAULT_BANDS,
};

export const MAX_ROUNDS = 400;

export function isTimestamp(value: string): boolean {
  const date = new Date(value);
  return typeof value === "string" && value.length > 0 && !Number.isNaN(date.getTime());
}

export function validateBands(bands: SpeedBand[]): string | null {
  if (!Array.isArray(bands) || bands.length === 0) return "يجب تحديد شريحة سرعة واحدة على الأقل";
  if (bands.some((b) => !Number.isInteger(b.percent) || b.percent < 0 || b.percent > 100)) {
    return "نسبة الشريحة يجب أن تكون بين 0 و 100";
  }
  const last = bands[bands.length - 1];
  if (last.maxSeconds !== null) return "الشريحة الأخيرة يجب أن تغطي ما بعد ذلك";
  const bounded = bands.slice(0, -1);
  if (bounded.some((b) => !Number.isInteger(b.maxSeconds) || (b.maxSeconds as number) <= 0)) {
    return "حد الشريحة يجب أن يكون عدد ثوانٍ موجباً";
  }
  for (let i = 1; i < bounded.length; i++) {
    if ((bounded[i].maxSeconds as number) <= (bounded[i - 1].maxSeconds as number)) {
      return "حدود الشرائح يجب أن تكون تصاعدية";
    }
  }
  for (let i = 1; i < bands.length; i++) {
    if (bands[i].percent > bands[i - 1].percent) return "نسب الشرائح يجب أن تكون تنازلية";
  }
  return null;
}

export function validateConfig(config: CompetitionConfig): string | null {
  if (!config.name.trim()) return "اسم المسابقة مطلوب";
  if (!isTimestamp(config.startsAt)) return "وقت البداية غير صالح";
  if (config.visibility !== "PUBLIC" && config.visibility !== "PRIVATE")
    return "نوع المسابقة غير صالح";
  if (!Number.isInteger(config.roundCount) || config.roundCount < 1) return "عدد الجولات غير صالح";
  if (config.roundCount > MAX_ROUNDS) return `عدد الجولات يجب ألا يتجاوز ${MAX_ROUNDS}`;
  if (!Number.isInteger(config.roundPeriodMinutes) || config.roundPeriodMinutes < 1)
    return "المدة بين الجولات غير صالحة";
  if (!Number.isInteger(config.roundWindowMinutes) || config.roundWindowMinutes < 1)
    return "مدة الجولة غير صالحة";
  if (config.roundWindowMinutes > config.roundPeriodMinutes)
    return "مدة الجولة يجب ألا تتجاوز المدة بين الجولات";
  if (!Number.isInteger(config.servedCount) || config.servedCount < 1)
    return "عدد أسئلة الجولة غير صالح";
  if (!Number.isInteger(config.poolSize) || config.poolSize < config.servedCount)
    return "حجم المخزون يجب أن يساوي عدد أسئلة الجولة أو يزيد عنه";
  if (!Number.isInteger(config.groupSize) || config.groupSize < 1)
    return "عدد جولات المجموعة غير صالح";
  if (
    !Number.isInteger(config.countingRounds) ||
    config.countingRounds < 1 ||
    config.countingRounds > config.groupSize
  ) {
    return "الجولات المحتسبة يجب أن تكون بين 1 وعدد جولات المجموعة";
  }
  if (typeof config.categoryRounds !== "boolean") return "خيار تصنيف الجولة غير صالح";
  return validateBands(config.speedBands);
}

export function bandPercent(bands: SpeedBand[], elapsedMs: number): number {
  const seconds = Math.max(0, elapsedMs) / 1000;
  for (const band of bands) {
    if (band.maxSeconds === null || seconds <= band.maxSeconds) return band.percent;
  }
  return bands[bands.length - 1]?.percent ?? 0;
}

export function bandScore(points: number, bands: SpeedBand[], elapsedMs: number): number {
  if (points <= 0) return 0;
  const percent = bandPercent(bands, elapsedMs);
  return Math.max(percent > 0 ? 1 : 0, Math.round((points * percent) / 100));
}
