import { FIRST_MEMBERSHIP_YEAR, runningYear } from "@/lib/membershipYear";
import type { AppSettingsValues } from "@/lib/settings";
import { settingsForm } from "@/lib/texts";

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
    label: settingsForm.membershipFeeLabel,
    kind: "number",
    min: 1,
    hint: settingsForm.membershipFeeHint,
  },
  {
    key: "membershipYear",
    label: settingsForm.membershipYearLabel,
    kind: "number",
    min: FIRST_MEMBERSHIP_YEAR,
    max: runningYear() + 1,
    hint: settingsForm.membershipYearHint,
  },
  {
    key: "tempPasswordHours",
    label: settingsForm.tempPasswordHoursLabel,
    kind: "number",
    min: 1,
    max: 720,
    hint: settingsForm.tempPasswordHoursHint,
  },
  {
    key: "supportWhatsapp",
    label: settingsForm.supportWhatsappLabel,
    kind: "phone",
    hint: settingsForm.supportWhatsappHint,
  },
  {
    key: "whatsappGroup",
    label: settingsForm.whatsappGroupLabel,
    kind: "url",
    placeholder: "https://chat.whatsapp.com/...",
    optional: true,
  },
  {
    key: "secretaryName",
    label: settingsForm.secretaryNameLabel,
    kind: "text",
    optional: true,
    hint: settingsForm.officerHint,
  },
  {
    key: "treasurerName",
    label: settingsForm.treasurerNameLabel,
    kind: "text",
    optional: true,
    hint: settingsForm.officerHint,
  },
];

export function cleanValue(field: SettingsField, raw: string): string | number {
  if (field.kind === "number") return Number(raw) || 0;
  if (field.kind === "phone") return raw.replace(/\D/g, "");
  return raw;
}
