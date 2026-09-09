import type { AppSettingsValues } from "./settings";

export interface PublicSettings {
  membershipFee: number;
  membershipYear: number;
  supportWhatsapp: string;
  asksBankReference: boolean;
  showsReferenceCode: boolean;
}

export function publicSettings(settings: AppSettingsValues): PublicSettings {
  return {
    membershipFee: settings.membershipFee,
    membershipYear: settings.membershipYear,
    supportWhatsapp: settings.supportWhatsapp,
    asksBankReference: settings.asksBankReference,
    showsReferenceCode: settings.showsReferenceCode,
  };
}
