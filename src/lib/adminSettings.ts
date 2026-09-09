import { hasFullAccess } from "./adminRoles";
import type { AppSettingsValues } from "./settings";

export interface ScopedSettings {
  membershipFee: number;
  membershipYear: number;
  secretaryName: string | null;
  treasurerName: string | null;
}

export function scopedSettings(settings: AppSettingsValues): ScopedSettings {
  return {
    membershipFee: settings.membershipFee,
    membershipYear: settings.membershipYear,
    secretaryName: settings.secretaryName,
    treasurerName: settings.treasurerName,
  };
}

export function adminSettings(
  settings: AppSettingsValues,
  role: string | null | undefined,
): AppSettingsValues | ScopedSettings {
  return hasFullAccess(role) ? settings : scopedSettings(settings);
}
