import webpush from "web-push";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { logger } from "./logger";
import { isOptOutCategory, type CategoryKey } from "./notificationCategories";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

const FALLBACK_SUBJECT = "https://ajvt-app.onrender.com";

function vapidSubject(): string {
  const configured = process.env.VAPID_SUBJECT?.trim();
  if (configured) return configured;
  const base = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  return base?.startsWith("https://") ? base : FALLBACK_SUBJECT;
}

if (publicKey && privateKey) {
  webpush.setVapidDetails(vapidSubject(), publicKey, privateKey);
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
  return Promise.all(
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

function silencedBy(category: CategoryKey) {
  if (!isOptOutCategory(category)) return {};
  return { user: { notificationPrefs: { none: { category, enabled: false } } } };
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
  category: CategoryKey,
) {
  if (!publicKey || !privateKey) return 0;
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId, ...silencedBy(category) },
  });
  await deliver(subscriptions, payload);
  return subscriptions.length;
}

async function sendBatched(
  where: Prisma.PushSubscriptionWhereInput,
  payload: { title: string; body: string; url?: string },
) {
  const subscriptions = await prisma.pushSubscription.findMany({ where });

  for (let i = 0; i < subscriptions.length; i += PUSH_BATCH) {
    await deliver(subscriptions.slice(i, i + PUSH_BATCH), payload);
  }
}

export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string },
  category: CategoryKey,
) {
  if (!publicKey || !privateKey || userIds.length === 0) return;
  await sendBatched({ userId: { in: userIds }, ...silencedBy(category) }, payload);
}

export async function sendPushIgnoringPreferences(
  userIds: string[],
  payload: { title: string; body: string; url?: string },
) {
  if (!publicKey || !privateKey || userIds.length === 0) return;
  await sendBatched({ userId: { in: userIds } }, payload);
}
