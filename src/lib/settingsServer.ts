import { prisma } from "./prisma";
import { SETTINGS_ID, DEFAULT_SETTINGS, type AppSettingsValues } from "./settings";

export async function getAppSettings(): Promise<AppSettingsValues> {
  const row = await prisma.appSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!row) return DEFAULT_SETTINGS;
  return {
    membershipFee: row.membershipFee,
    supportWhatsapp: row.supportWhatsapp,
    tempPasswordHours: row.tempPasswordHours,
    whatsappGroup: row.whatsappGroup,
  };
}

export async function saveAppSettings(values: Partial<AppSettingsValues>) {
  return prisma.appSettings.upsert({
    where: { id: SETTINGS_ID },
    update: values,
    create: { id: SETTINGS_ID, ...DEFAULT_SETTINGS, ...values },
  });
}
