import { prisma } from "./prisma";
import { NOTIFICATION_CATEGORIES } from "./notificationCategories";

export async function notificationChoices(userId: string) {
  const rows = await prisma.notificationPreference.findMany({
    where: { userId },
    select: { category: true, enabled: true },
  });
  const off = new Set(rows.filter((row) => !row.enabled).map((row) => row.category));

  return NOTIFICATION_CATEGORIES.map((category) => ({
    key: category.key,
    label: category.label,
    optOut: category.optOut,
    enabled: category.optOut ? !off.has(category.key) : true,
  }));
}

export async function setNotificationChoice(userId: string, category: string, enabled: boolean) {
  await prisma.notificationPreference.upsert({
    where: { userId_category: { userId, category } },
    create: { userId, category, enabled },
    update: { enabled },
  });
}
