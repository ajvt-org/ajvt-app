export const SETTINGS_ID = "singleton";

export interface AppSettingsValues {
  membershipFee: number;
  supportWhatsapp: string;
  whatsappGroup: string | null;
}

export const DEFAULT_SETTINGS: AppSettingsValues = {
  membershipFee: 100,
  supportWhatsapp: "22241070328",
  whatsappGroup: null,
};
