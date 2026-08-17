import * as bcrypt from "bcryptjs";
import { prisma } from "./client";
import { AGE_GROUPS } from "./data";
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
  for (const name of AGE_GROUPS) {
    await prisma.ageGroup.upsert({ where: { name }, update: {}, create: { name } });
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
          createdAt: daysAgo(120 - i * 3),
        },
      }),
    );
  }

  return users;
}
