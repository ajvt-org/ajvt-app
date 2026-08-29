import * as bcrypt from "bcryptjs";
import { prisma } from "./client";
import { AGE_GROUP_ROSTER, SEED_VILLAGES, SUGGESTED_AGE_GROUP } from "./data";
import { daysAgo, phone } from "./random";

const ADMINS: [string, string][] = [
  ["admin", "SUPER"],
  ["members", "MEMBERS"],
  ["activities", "ACTIVITIES"],
];

export async function seedAdmins() {
  const password = await bcrypt.hash("admin123", 12);
  for (const [username, role] of ADMINS) {
    await prisma.admin.upsert({
      where: { username },
      update: { password, role },
      create: { username, password, role },
    });
  }
}

export async function seedAgeGroups() {
  for (const { name, total } of AGE_GROUP_ROSTER) {
    await prisma.ageGroup.upsert({
      where: { name },
      update: { totalCount: total, approved: true },
      create: { name, totalCount: total, approved: true },
    });
  }
  await prisma.ageGroup.upsert({
    where: { name: SUGGESTED_AGE_GROUP },
    update: { approved: false },
    create: { name: SUGGESTED_AGE_GROUP, approved: false },
  });
}

export async function seedVillages() {
  for (const name of SEED_VILLAGES) {
    await prisma.village.upsert({ where: { name }, update: {}, create: { name } });
  }
}

export async function seedPushSubscriptions(userIds: string[]) {
  for (const [i, userId] of userIds.entries()) {
    await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: `https://push.invalid/seed-${i}`,
        p256dh: "seed-p256dh",
        auth: "seed-auth",
      },
    });
  }
}

export async function seedUsers(count: number) {
  const password = await bcrypt.hash("user123", 12);
  const users = [];

  for (let i = 0; i < count; i++) {
    users.push(
      await prisma.user.create({
        data: {
          phone: phone(i),
          password,
          currentStreak: i % 5,
          longestStreak: (i % 5) + (i % 3),
          lastActiveDate: i % 4 === 0 ? daysAgo(i % 7) : null,
          createdAt: daysAgo(i % 120),
        },
      }),
    );
  }

  return users;
}
