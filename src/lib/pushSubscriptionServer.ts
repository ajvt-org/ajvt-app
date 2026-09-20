import { prisma } from "./prisma";

export interface SubscriptionKeys {
  p256dh: string;
  auth: string;
}

export async function saveSubscription(
  userId: string,
  endpoint: string,
  keys: SubscriptionKeys,
): Promise<void> {
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });
}

export async function dropSubscription(userId: string, endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
}
