import { FIRST_MEMBERSHIP_YEAR, runningYear } from "@/lib/membershipYear";
import type { AppSettingsValues } from "@/lib/settings";

export interface SettingsField {
  key: keyof AppSettingsValues;
  label: string;
  kind: "number" | "phone" | "url" | "text";
  hint?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  optional?: boolean;
}

export const SETTINGS_FIELDS: SettingsField[] = [
  {
    key: "membershipFee",
    label: "رسم العضوية (أوقية)",
    kind: "number",
    min: 1,
    hint: "المبلغ الأدنى المقبول في استمارة الانضمام.",
  },
  {
    key: "membershipYear",
    label: "سنة العضوية الجارية",
    kind: "number",
    min: FIRST_MEMBERSHIP_YEAR,
    max: runningYear() + 1,
    hint: "السنة التي تُسجَّل عليها طلبات الانضمام الجديدة.",
  },
  {
    key: "tempPasswordHours",
    label: "صلاحية كلمة المرور المؤقتة (ساعة)",
    kind: "number",
    min: 1,
    max: 720,
    hint: "بعد هذه المدة تتوقف كلمة المرور المؤقتة عن العمل ويحتاج العضو إلى واحدة جديدة.",
  },
  {
    key: "supportWhatsapp",
    label: "رقم واتساب الدعم",
    kind: "phone",
    hint: "يُستعمل في صفحة استعادة كلمة المرور، مع رمز الدولة ودون علامة +.",
  },
  {
    key: "whatsappGroup",
    label: "رابط مجموعة الواتساب",
    kind: "url",
    placeholder: "https://chat.whatsapp.com/...",
    optional: true,
  },
  {
    key: "secretaryName",
    label: "اسم الأمين العام",
    kind: "text",
    optional: true,
    hint: "يُطبع على وصل القبض مكان التوقيع.",
  },
  {
    key: "treasurerName",
    label: "اسم مسؤول المالية",
    kind: "text",
    optional: true,
    hint: "يُطبع على وصل القبض مكان التوقيع.",
  },
];

export function cleanValue(field: SettingsField, raw: string): string | number {
  if (field.kind === "number") return Number(raw) || 0;
  if (field.kind === "phone") return raw.replace(/\D/g, "");
  return raw;
}
