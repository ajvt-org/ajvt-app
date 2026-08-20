import webpush from "web-push";
import { prisma } from "./prisma";
import { logger } from "./logger";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
  // Must be an https: or mailto: URL per the Web Push spec — NEXT_PUBLIC_BASE_URL
  // is http:// in local dev, so it can't be reused here.
  webpush.setVapidDetails("https://ajvt-app.onrender.com", publicKey, privateKey);
}

export const PUSH_BATCH = 25;

interface Subscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function deliver(
  subscriptions: Subscription[],
  payload: { title: string; body: string; url?: string },
) {
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          logger.error("push.send.error", err);
        }
      }
    }),
  );
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
) {
  if (!publicKey || !privateKey) return;
  await deliver(await prisma.pushSubscription.findMany({ where: { userId } }), payload);
}

export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string },
) {
  if (!publicKey || !privateKey || userIds.length === 0) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });

  for (let i = 0; i < subscriptions.length; i += PUSH_BATCH) {
    await deliver(subscriptions.slice(i, i + PUSH_BATCH), payload);
  }
}
