import { prisma } from "./prisma";
import { SETTINGS_ID, defaultSettings, type AppSettingsValues } from "./settings";
import { resolveMembershipYear } from "./membershipYear";

export async function getAppSettings(): Promise<AppSettingsValues> {
  const row = await prisma.appSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!row) return defaultSettings();
  return {
    membershipFee: row.membershipFee,
    membershipYear: resolveMembershipYear(row.membershipYear),
    supportWhatsapp: row.supportWhatsapp,
    tempPasswordHours: row.tempPasswordHours,
    whatsappGroup: row.whatsappGroup,
  };
}

export async function saveAppSettings(values: Partial<AppSettingsValues>) {
  return prisma.appSettings.upsert({
    where: { id: SETTINGS_ID },
    update: values,
    create: { id: SETTINGS_ID, ...defaultSettings(), ...values },
  });
}
