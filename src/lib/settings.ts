import { runningYear } from "./membershipYear";

export const SETTINGS_ID = "singleton";

export interface AppSettingsValues {
  membershipFee: number;
  membershipYear: number;
  supportWhatsapp: string;
  tempPasswordHours: number;
  whatsappGroup: string | null;
  secretaryName: string | null;
  treasurerName: string | null;
}

export const DEFAULT_SETTINGS: Omit<AppSettingsValues, "membershipYear"> = {
  membershipFee: 100,
  supportWhatsapp: "22241070328",
  tempPasswordHours: 1,
  whatsappGroup: null,
  secretaryName: null,
  treasurerName: null,
};

export function defaultSettings(now?: Date): AppSettingsValues {
  return { ...DEFAULT_SETTINGS, membershipYear: runningYear(now) };
}
