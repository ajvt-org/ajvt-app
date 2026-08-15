export const SETTINGS_ID = "singleton";

export interface AppSettingsValues {
  membershipFee: number;
  supportWhatsapp: string;
  tempPasswordHours: number;
  whatsappGroup: string | null;
}

export const DEFAULT_SETTINGS: AppSettingsValues = {
  membershipFee: 100,
  supportWhatsapp: "22241070328",
  tempPasswordHours: 1,
  whatsappGroup: null,
};
