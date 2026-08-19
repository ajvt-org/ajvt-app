export type Visibility = "PUBLIC" | "PRIVATE";

// A correct answer keeps every point until fullSeconds, then falls in a straight
// line to floorPercent at maxSeconds and stays there. maxSeconds is what one
// question allows, so every question of a quiz decays on the same curve.
export interface ScoreCurve {
  fullSeconds: number;
  maxSeconds: number;
  floorPercent: number;
}

export interface CompetitionConfig extends ScoreCurve {
  name: string;
  startsAt: string;
  visibility: Visibility;
  bankId: string;
  roundCount: number;
  roundPeriodMinutes: number;
  roundWindowMinutes: number;
  servedCount: number;
  poolSize: number;
  groupSize: number;
  countingRounds: number;
  categoryRounds: boolean;
}

export const DEFAULT_CURVE: ScoreCurve = {
  fullSeconds: 10,
  maxSeconds: 30,
  floorPercent: 50,
};

export const DEFAULT_CONFIG: Omit<CompetitionConfig, "name" | "startsAt"> = {
  visibility: "PUBLIC",
  bankId: "general",
  roundCount: 30,
  roundPeriodMinutes: 1440,
  roundWindowMinutes: 840,
  servedCount: 10,
  poolSize: 30,
  groupSize: 7,
  countingRounds: 6,
  categoryRounds: false,
  ...DEFAULT_CURVE,
};

export const MAX_ROUNDS = 400;

export function isTimestamp(value: string): boolean {
  const date = new Date(value);
  return typeof value === "string" && value.length > 0 && !Number.isNaN(date.getTime());
}

export function validateCurve(curve: ScoreCurve): string | null {
  if (!Number.isInteger(curve.fullSeconds) || curve.fullSeconds < 0)
    return "مهلة النقاط الكاملة يجب أن تكون عدد ثوانٍ صحيحاً";
  if (!Number.isInteger(curve.maxSeconds) || curve.maxSeconds <= curve.fullSeconds)
    return "مدة السؤال يجب أن تتجاوز مهلة النقاط الكاملة";
  if (!Number.isInteger(curve.floorPercent) || curve.floorPercent < 0 || curve.floorPercent > 100)
    return "أقل نسبة يجب أن تكون بين 0 و 100";
  return null;
}

export function validateConfig(config: CompetitionConfig): string | null {
  if (!config.name.trim()) return "اسم المسابقة مطلوب";
  if (!isTimestamp(config.startsAt)) return "وقت البداية غير صالح";
  if (config.visibility !== "PUBLIC" && config.visibility !== "PRIVATE")
    return "نوع المسابقة غير صالح";
  if (typeof config.bankId !== "string" || !config.bankId) return "بنك الأسئلة مطلوب";
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
  return validateCurve(config);
}

export function curvePercent(curve: ScoreCurve, elapsedMs: number): number {
  const seconds = Math.max(0, elapsedMs) / 1000;
  if (seconds <= curve.fullSeconds) return 100;
  if (seconds >= curve.maxSeconds) return curve.floorPercent;
  const share = (seconds - curve.fullSeconds) / (curve.maxSeconds - curve.fullSeconds);
  return (1 - share) * (100 - curve.floorPercent) + curve.floorPercent;
}

export function curveScore(points: number, curve: ScoreCurve, elapsedMs: number): number {
  if (points <= 0) return 0;
  return Math.round((points * curvePercent(curve, elapsedMs)) / 100);
}
