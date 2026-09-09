import { FIRST_MEMBERSHIP_YEAR, runningYear } from "@/lib/membershipYear";
import type { AppSettingsValues } from "@/lib/settings";
import { settingsForm } from "@/lib/texts";

export const SETTINGS_GROUPS = [
  { key: "membership", title: settingsForm.membershipGroup },
  { key: "access", title: settingsForm.accessGroup },
  { key: "channels", title: settingsForm.channelsGroup },
  { key: "officers", title: settingsForm.officersGroup },
] as const;

export type SettingsGroupKey = (typeof SETTINGS_GROUPS)[number]["key"];

interface FieldBase {
  key: keyof AppSettingsValues;
  group: SettingsGroupKey;
  label: string;
  hint?: string;
}

export interface SettingsInput extends FieldBase {
  kind: "number" | "phone" | "url" | "text";
  min?: number;
  max?: number;
  placeholder?: string;
  optional?: boolean;
}

export interface SettingsToggle extends FieldBase {
  kind: "switch";
}

export type SettingsField = SettingsInput | SettingsToggle;

export const SETTINGS_FIELDS: SettingsField[] = [
  {
    key: "membershipFee",
    group: "membership",
    label: settingsForm.membershipFeeLabel,
    kind: "number",
    min: 1,
  },
  {
    key: "membershipYear",
    group: "membership",
    label: settingsForm.membershipYearLabel,
    kind: "number",
    min: FIRST_MEMBERSHIP_YEAR,
    max: runningYear() + 1,
  },
  {
    key: "asksBankReference",
    group: "membership",
    label: settingsForm.asksBankReferenceLabel,
    kind: "switch",
  },
  {
    key: "showsReferenceCode",
    group: "membership",
    label: settingsForm.showsReferenceCodeLabel,
    kind: "switch",
    hint: settingsForm.showsReferenceCodeHint,
  },
  {
    key: "tempPasswordHours",
    group: "access",
    label: settingsForm.tempPasswordHoursLabel,
    kind: "number",
    min: 1,
    max: 720,
  },
  {
    key: "supportWhatsapp",
    group: "channels",
    label: settingsForm.supportWhatsappLabel,
    kind: "phone",
  },
  {
    key: "whatsappGroup",
    group: "channels",
    label: settingsForm.whatsappGroupLabel,
    kind: "url",
    placeholder: "https://chat.whatsapp.com/...",
    optional: true,
  },
  {
    key: "secretaryName",
    group: "officers",
    label: settingsForm.secretaryNameLabel,
    kind: "text",
    optional: true,
  },
  {
    key: "treasurerName",
    group: "officers",
    label: settingsForm.treasurerNameLabel,
    kind: "text",
    optional: true,
    hint: settingsForm.officerHint,
  },
];

export function groupedFields(): {
  key: SettingsGroupKey;
  title: string;
  fields: SettingsField[];
}[] {
  return SETTINGS_GROUPS.map((group) => ({
    ...group,
    fields: SETTINGS_FIELDS.filter((field) => field.group === group.key),
  }));
}

export function cleanValue(field: SettingsField, raw: string): string | number | boolean {
  if (field.kind === "switch") return raw === "true";
  if (field.kind === "number") return Number(raw) || 0;
  if (field.kind === "phone") return raw.replace(/\D/g, "");
  return raw;
}
