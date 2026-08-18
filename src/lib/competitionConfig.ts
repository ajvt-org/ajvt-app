export interface SpeedBand {
  maxSeconds: number | null;
  percent: number;
}

export interface CompetitionConfig {
  name: string;
  startsOn: string;
  days: number;
  publishMinutes: number;
  cutoffMinutes: number;
  servedCount: number;
  poolSize: number;
  weeklyCountingDays: number;
  speedBands: SpeedBand[];
}

export const DEFAULT_BANDS: SpeedBand[] = [
  { maxSeconds: 10, percent: 100 },
  { maxSeconds: 30, percent: 75 },
  { maxSeconds: null, percent: 50 },
];

export const DEFAULT_CONFIG: Omit<CompetitionConfig, "name" | "startsOn"> = {
  days: 30,
  publishMinutes: 8 * 60,
  cutoffMinutes: 22 * 60,
  servedCount: 10,
  poolSize: 30,
  weeklyCountingDays: 6,
  speedBands: DEFAULT_BANDS,
};

const DAY_MINUTES = 24 * 60;

export function isDayStamp(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
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
  if (!isDayStamp(config.startsOn)) return "تاريخ البداية غير صالح";
  if (!Number.isInteger(config.days) || config.days < 1) return "عدد الأيام غير صالح";
  if (!Number.isInteger(config.publishMinutes) || config.publishMinutes < 0)
    return "وقت الفتح غير صالح";
  if (!Number.isInteger(config.cutoffMinutes) || config.cutoffMinutes > DAY_MINUTES)
    return "وقت الإغلاق غير صالح";
  if (config.cutoffMinutes <= config.publishMinutes) return "وقت الإغلاق يجب أن يكون بعد وقت الفتح";
  if (!Number.isInteger(config.servedCount) || config.servedCount < 1)
    return "عدد الأسئلة اليومية غير صالح";
  if (!Number.isInteger(config.poolSize) || config.poolSize < config.servedCount)
    return "حجم المخزون يجب أن يساوي عدد الأسئلة اليومية أو يزيد عنه";
  if (
    !Number.isInteger(config.weeklyCountingDays) ||
    config.weeklyCountingDays < 1 ||
    config.weeklyCountingDays > 7
  ) {
    return "عدد الأيام المحتسبة في الأسبوع يجب أن يكون بين 1 و 7";
  }
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

export function dayStamps(startsOn: string, days: number): string[] {
  const start = new Date(`${startsOn}T00:00:00.000Z`);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}
